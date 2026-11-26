import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export function addTreeTerrainLayer(lmap, maplibregl) {
  if (typeof THREE === 'undefined') return;
  if (!GLTFLoader) {
    console.warn('[tree] GLTFLoader 未加载');
    return;
  }

  const TOTAL_MAX = 10000;   // 视野内树数上限
  const GRID_M = 12;         // 网格树距（米）
  const JITTER_M = 3;       // 每棵树极坐标随机偏移最大距离（米）
  const VARIANTS = 3;       // 树模型变体数

  const MODEL_URLS = [
    'models/tree-deciduous-a.glb',
    'models/tree-deciduous-b.glb',
    'models/tree-evergreen.glb'
  ];

  let treeData = [];
  let grownCells = new Set();   // 已长过树的格子key = "gx,gy"
  let started = false;
  let variants = null;
  let originMerc = null;       
  let originLng = 0, originLat = 0;
  let renderMerc = null;
  let renderEast = 0;
  let renderNorth = 0;
  const RENDER_REBASE_M = 256;
  let layer = null;
  let refreshTimer = null;
  const TREE_MIN_ZOOM = 17;

  function hash2(gx, gy, salt) {
    let h = (gx * 374761393) ^ (gy * 668265263) ^ (salt * 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }

  function toEastNorth(lng, lat) {
    const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const unit = originMerc.meterInMercatorCoordinateUnits();
    return [(m.x - originMerc.x) / unit, (originMerc.y - m.y) / unit];
  }
 
  function updateRenderOrigin(centerMerc) {
    const unit = originMerc.meterInMercatorCoordinateUnits();
    const east = (centerMerc.x - originMerc.x) / unit;
    const north = (originMerc.y - centerMerc.y) / unit;
    const distance2 = (east - renderEast) ** 2 + (north - renderNorth) ** 2;
    if (renderMerc && distance2 < RENDER_REBASE_M ** 2) return false;

    renderMerc = centerMerc;
    renderEast = east;
    renderNorth = north;
    return true;
  }

  function inRing(x, y, ring) {
    let ins = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  function inPolyMeters(x, y, outer, holes) {
    if (!inRing(x, y, outer)) return false;
    for (let h = 0; h < holes.length; h++) if (inRing(x, y, holes[h])) return false;
    return true;
  }

  const TILE_EXTENT = 8192;
  let lastCoverage = null;
  let lastTreeData = null;
  let lastExaggeration = null;
  let lastMeshSize = null;
  let warnedTerrainAPI = false;

  // 与地形网格一致：每格沿左上到右下的对角线分成两个三角形。
  function sampleTerrainTriangle(sampler, x, y, meshSize) {
    const step = TILE_EXTENT / meshSize;
    const column = Math.min(meshSize - 1, Math.max(0, Math.floor(x / step)));
    const row = Math.min(meshSize - 1, Math.max(0, Math.floor(y / step)));
    const x0 = column * step;
    const y0 = row * step;
    const u = Math.min(1, Math.max(0, (x - x0) / step));
    const v = Math.min(1, Math.max(0, (y - y0) / step));
    const topLeft = sampler(x0, y0, TILE_EXTENT);
    const bottomRight = sampler(x0 + step, y0 + step, TILE_EXTENT);

    if (v >= u) {
      const bottomLeft = sampler(x0, y0 + step, TILE_EXTENT);
      return topLeft * (1 - v) + bottomLeft * (v - u) + bottomRight * u;
    }

    const topRight = sampler(x0 + step, y0, TILE_EXTENT);
    return topLeft * (1 - u) + topRight * (u - v) + bottomRight * v;
  }

  function updateTerrainHeights() {
    const terrain = lmap.terrain;
    if (!terrain?.getCoverageIndex && lmap.getTerrain() && !warnedTerrainAPI) {
      warnedTerrainAPI = true;
      console.warn('[tree] 当前 MapLibre 版本未提供地形覆盖索引，暂不显示无可用高程的树');
    }
    const meshSize = terrain?.meshSize;
    const usableMesh = Number.isInteger(meshSize) && meshSize > 0;
    const coverage = usableMesh ? terrain?.getCoverageIndex?.() ?? null : null;
    const exaggeration = terrain?.exaggeration ?? 1;
    if (coverage === lastCoverage && treeData === lastTreeData &&
        exaggeration === lastExaggeration && meshSize === lastMeshSize) return false;

    lastCoverage = coverage;
    lastTreeData = treeData;
    lastExaggeration = exaggeration;
    lastMeshSize = meshSize;
    let changed = false;
    for (const tree of treeData) {
      let sampler = null;
      let x = 0;
      let y = 0;
      if (coverage) {
        const wrap = Math.floor(tree.worldX);
        for (const z of coverage.zooms) {
          const scale = 2 ** z;
          const scaledX = (tree.worldX - wrap) * scale;
          const scaledY = tree.worldY * scale;
          const tx = Math.floor(scaledX);
          const ty = Math.floor(scaledY);
          const key = wrap + '/' + z + '/' + tx + '/' + ty;
          const match = coverage.samplerPerTile.get(key);
          if (match === undefined) continue;
          sampler = match;
          x = (scaledX - tx) * TILE_EXTENT;
          y = (scaledY - ty) * TILE_EXTENT;
          break;
        }
      }

      if (tree.terrainSampler === sampler && tree.exaggeration === exaggeration &&
          tree.terrainMeshSize === meshSize) continue;
      tree.terrainSampler = sampler;
      tree.exaggeration = exaggeration;
      tree.terrainMeshSize = meshSize;
      const sample = sampler
        ? sampleTerrainTriangle(sampler, x, y, meshSize) * exaggeration
        : null;
      const elev = Number.isFinite(sample) ? sample : null;
      if (elev !== tree.elev) {
        tree.elev = elev;
        changed = true;
      }
    }
    return changed;
  }

  function loadGLBModels() {
    const loader = new GLTFLoader();
    const tasks = MODEL_URLS.map(url => new Promise((resolve, reject) => {
      loader.load(url,
        g => {
          const meshes = [];
          g.scene.traverse(o => {
            if (o.isMesh) meshes.push({ geometry: o.geometry, material: o.material });
          });
          resolve({ meshes });
        },
        undefined,
        err => reject(err)
      );
    }));
    return Promise.all(tasks);
  }

  function pushTree(gx, gy) {
    const ang = hash2(gx, gy, 0) * Math.PI * 2 - Math.PI;
    const rad = hash2(gx, gy, 1) * JITTER_M;
    const e = gx + rad * Math.cos(ang);
    const n = gy + rad * Math.sin(ang);
    const unit = originMerc.meterInMercatorCoordinateUnits();
    treeData.push({
      gx, gy, east: e, north: n,
      worldX: originMerc.x + e * unit,
      worldY: originMerc.y - n * unit,
      elev: null,
      terrainSampler: null,
      exaggeration: null,
      sc: 0.8 + hash2(gx, gy, 2) * 0.6,
      rotY: hash2(gx, gy, 3) * Math.PI * 2,
      v: Math.floor(hash2(gx, gy, 4) * VARIANTS)
    });
  }

  function collectTreeCells(co, area, candidates) {
    if (!co[0]?.length) return;
    const outer = co[0].map(([lng, lat]) => toEastNorth(lng, lat));
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const [x, y] of outer) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const x0 = Math.ceil(Math.max(minX, area.minX) / GRID_M) * GRID_M;
    const x1 = Math.min(maxX, area.maxX);
    const y0 = Math.ceil(Math.max(minY, area.minY) / GRID_M) * GRID_M;
    const y1 = Math.min(maxY, area.maxY);
    if (![x0, x1, y0, y1].every(Number.isFinite) || x0 > x1 || y0 > y1) return;

    const holes = co.slice(1).map(ring =>
      ring.map(([lng, lat]) => toEastNorth(lng, lat))
    );
    for (let gx = x0; gx <= x1; gx += GRID_M) {
      for (let gy = y0; gy <= y1; gy += GRID_M) {
        const key = gx + ',' + gy;
        if (candidates.has(key) || !inPolyMeters(gx, gy, outer, holes)) continue;
        candidates.set(key, { gx, gy });
      }
    }
  }

  function growTreesInView() {
    if (!originMerc || lmap.getZoom() < TREE_MIN_ZOOM) return;
    let feats;
    try {
      feats = lmap.querySourceFeatures('開放免費地圖', {
        sourceLayer: 'landcover',
        filter: ['==', ['get', 'class'], 'wood']
      });
    } catch {
      return;
    }
    if (!feats?.length) return;

    const center = lmap.getCenter();
    const [curE, curN] = toEastNorth(center.lng, center.lat);
    const bounds = lmap.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const [swE, swN] = toEastNorth(sw.lng, sw.lat);
    const [neE, neN] = toEastNorth(ne.lng, ne.lat);
    const width = Math.abs(neE - swE);
    const height = Math.abs(neN - swN);
    const padX = Math.max(GRID_M, width * 0.15);
    const padY = Math.max(GRID_M, height * 0.15);
    const area = {
      minX: Math.min(swE, neE) - padX,
      maxX: Math.max(swE, neE) + padX,
      minY: Math.min(swN, neN) - padY,
      maxY: Math.max(swN, neN) + padY
    };

    const recycleR2 = 4 * (width * width + height * height);
    const distance2 = (x, y) => (x - curE) ** 2 + (y - curN) ** 2;
    const candidates = new Map();
    for (const t of treeData) {
      if (distance2(t.gx, t.gy) <= recycleR2) {
        candidates.set(t.gx + ',' + t.gy, { gx: t.gx, gy: t.gy, tree: t });
      }
    }

    for (const f of feats) {
      const g = f.geometry;
      if (g.type === 'Polygon') {
        collectTreeCells(g.coordinates, area, candidates);
      } else if (g.type === 'MultiPolygon') {
        for (const polygon of g.coordinates) {
          collectTreeCells(polygon, area, candidates);
        }
      }
    }

    const selected = [...candidates.entries()];
    if (selected.length > TOTAL_MAX) {
      selected.sort(([, a], [, b]) =>
        distance2(a.gx, a.gy) - distance2(b.gx, b.gy) ||
        a.gx - b.gx || a.gy - b.gy
      );
      selected.length = TOTAL_MAX;
    }

    const added = selected.reduce((n, [, c]) => n + (c.tree ? 0 : 1), 0);
    const recycled = treeData.length - (selected.length - added);
    if (added === 0 && recycled === 0) return;

    treeData = [];
    grownCells.clear();
    for (const [key, c] of selected) {
      grownCells.add(key);
      if (c.tree) treeData.push(c.tree);
      else pushTree(c.gx, c.gy);
    }

    layer?.onTreesChanged?.();
    console.log('[tree] 新增 +' + added + ' 回收 ' + recycled + ' 总数 ' + treeData.length);
  }

  async function main() {
    if (started) return;
    started = true;

    try {
      variants = await loadGLBModels();
    } catch (e) {
      console.error('[tree] GLB 模型加载失败，停止种树:', e);
      return;
    }

    const c = lmap.getCenter();
    originLng = c.lng;
    originLat = c.lat;
    originMerc = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0);
    renderMerc = originMerc;
    renderEast = 0;
    renderNorth = 0;

    layer = {
      id: 'trees-3d',
      type: 'custom',
      renderingMode: '3d',
      minzoom: TREE_MIN_ZOOM,
      onAdd(map, gl) {
        this.map = map;
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();
        this.scene.rotateX(Math.PI / 2);
        this.scene.scale.multiply(new THREE.Vector3(1, 1, -1));

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
        sun.position.set(300, 500, 200);
        sun.target.position.set(0, 0, 0);
        this.scene.add(sun);
        this.scene.add(sun.target);

        this.instanced = [];
        this.capacityPerVariant = [0, 0, 0];
        this.dummy = new THREE.Object3D();

        this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: false });
        this.renderer.autoClear = false;
      },
      onTreesChanged() {
        if (!this.scene) return;
        const counts = new Array(VARIANTS).fill(0);
        for (const t of treeData) counts[t.v]++;

        let needRebuild = false;
        for (let v = 0; v < VARIANTS; v++) {
          if (counts[v] > this.capacityPerVariant[v]) needRebuild = true;
        }

        if (needRebuild) {
          // 销毁旧的InstancedMesh
          if (this.instanced) {
            for (const arr of this.instanced) {
              if (!arr) continue;
              for (const m of arr) { if (m) { this.scene.remove(m); m.dispose(); } }
            }
          }
          this.instanced = [];
          this.capacityPerVariant = counts.slice();

          for (let v = 0; v < VARIANTS; v++) {
            this.instanced[v] = [];
            if (!counts[v] || !variants[v]) continue;
            for (const mesh of variants[v].meshes) {
              const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, counts[v]);
              inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
              this.instanced[v].push(inst);
              this.scene.add(inst);
            }
          }
        }
        this.applyMatrices();
        if (this.map) this.map.triggerRepaint();
      },
      applyMatrices() {
        if (!this.dummy || !this.instanced) return;
        const d = this.dummy;
        const idx = new Array(VARIANTS).fill(0);
        for (const meshes of this.instanced) {
          if (!meshes) continue;
          for (const inst of meshes) inst.count = 0;
        }
        for (let i = 0; i < treeData.length; i++) {
          const t = treeData[i];
          if (t.elev == null) continue;
          const k = idx[t.v]++;
          d.position.set(
            t.east - renderEast,
            t.elev,
            t.north - renderNorth
          );
          d.scale.setScalar(t.sc * 0.4);
          d.rotation.set(0, t.rotY, 0);
          d.updateMatrix();
          if (this.instanced[t.v]) {
            for (const inst of this.instanced[t.v]) {
              inst.setMatrixAt(k, d.matrix);
              inst.count = idx[t.v];
            }
          }
        }
        for (const arr of this.instanced) {
          if (!arr) continue;
          for (const inst of arr) {
            if (!inst) continue;
            inst.instanceMatrix.needsUpdate = true;
            inst.boundingSphere = null;
          }
        }
      },
      render(gl, args) {
        if (!originMerc) return;
        if (lmap.getZoom() < TREE_MIN_ZOOM) return;
        const viewCenter = maplibregl.MercatorCoordinate.fromLngLat(lmap.getCenter(), 0);
        const originChanged = updateRenderOrigin(viewCenter);
        const heightsChanged = treeData.length > 0 && updateTerrainHeights();
        if (originChanged || heightsChanged) this.applyMatrices();
        const mm = Array.isArray(args)
          ? args
          : (args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : args.projectionMatrix);
        const m = new THREE.Matrix4().fromArray(mm);
        const horizontalUnit = originMerc.meterInMercatorCoordinateUnits();
        // 水平单位沿用种树网格，高程单位跟随当前视图。
        const heightUnit = viewCenter.meterInMercatorCoordinateUnits();
        const l = new THREE.Matrix4()
          .makeTranslation(renderMerc.x, renderMerc.y, 0)
          .scale(new THREE.Vector3(horizontalUnit, -horizontalUnit, heightUnit));
        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.state.reset();
        this.renderer.render(this.scene, this.camera);
      }
    };

    try {
      lmap.addLayer(layer);
    } catch (e) {
      console.error(e);
      return;
    }
    function scheduleGrow() {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        growTreesInView();
      }, 300);
    }
    lmap.on('idle', scheduleGrow);
    lmap.on('moveend', scheduleGrow);

    // 初始长一次
    growTreesInView();
    if (layer && layer.onTreesChanged) layer.onTreesChanged();
  }

  if (lmap.loaded && lmap.loaded()) {
    main();
  } else if (lmap.isStyleLoaded && lmap.isStyleLoaded()) {
    main();
  } else {
    lmap.once('load', main);
  }
}
