export function addTreeTerrainLayer(lmap,maplibregl) {
  if (typeof THREE === 'undefined') return;
  if (!THREE.GLTFLoader) {
    console.warn('[tree] THREE.GLTFLoader 未加载');
    return;
  }

  const TOTAL_MAX = 10000;   // 树林总棵数上限
  const GRID_M = 12;         // 正方形网格树距（米）
  const JITTER_M = 3;       // 每棵树极坐标随机偏移最大距离（米）
  const VARIANTS = 3;       // 树模型变体数（3 个 GLB）

  const MODEL_URLS = [
    'models/tree-deciduous-a.glb',
    'models/tree-deciduous-b.glb',
    'models/tree-evergreen.glb'
  ];

  let treeData = [];
  let started = false;
  let variants = null;
  let originMerc = null;
  let layer = null;
  let refreshTimer = null;
  const TREE_MIN_ZOOM = 17;
  let lastRebuildLng = null;
  let lastRebuildLat = null;
  let lastRebuildCount = -1;

  function makeEastNative(centerLngLat) {
    const origin = maplibregl.MercatorCoordinate.fromLngLat(centerLngLat, 0);
    return function (lng, lat) {
      const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
      const unit = origin.meterInMercatorCoordinateUnits();
      return [(m.x - origin.x) / unit, (origin.y - m.y) / unit];
    };
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

  // ---- 经纬度 <-> 局部米制（以东/北为轴） ----
  function makeMeterFrame(lng0, lat0) {
    const mLon = 111320 * Math.cos(lat0 * Math.PI / 180);
    return {
      toMeters(lng, lat) { return [(lng - lng0) * mLon, (lat - lat0) * 111320]; },
      toLngLat(e, n) { return [lng0 + e / mLon, lat0 + n / 111320]; }
    };
  }

  // ---- 多边形内正方形网格点 + 极坐标随机偏移 ----
  function scatterGrid(co) {
    const ring = co[0];
    let a = 180, b = -180, c = 90, d = -90;
    for (const [lo, la] of ring) {
      a = Math.min(a, lo); b = Math.max(b, lo);
      c = Math.min(c, la); d = Math.max(d, la);
    }
    const fr = makeMeterFrame((a + b) / 2, (c + d) / 2);
    const outer = ring.map(([lo, la]) => fr.toMeters(lo, la));
    const holes = co.slice(1).map(h => h.map(([lo, la]) => fr.toMeters(lo, la)));

    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [x, y] of outer) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const out = [];
    for (let gx = Math.floor(x0 / GRID_M) * GRID_M; gx <= x1; gx += GRID_M) {
      for (let gy = Math.floor(y0 / GRID_M) * GRID_M; gy <= y1; gy += GRID_M) {
        if (!inPolyMeters(gx, gy, outer, holes)) continue;
        const ang = (Math.random() * 2 - 1) * Math.PI;
        const rad = Math.random() * JITTER_M;
        out.push(fr.toLngLat(gx + rad * Math.cos(ang), gy + rad * Math.sin(ang)));
      }
    }
    return out;
  }

  function loadTrees() {
    let feats;
    try {
      feats = lmap.querySourceFeatures('開放免費地圖', {
        sourceLayer: 'landcover',
        filter: ['==', ['get', 'class'], 'wood']
      });
    } catch (e) {
      console.warn('[tree] querySourceFeatures 抛错:', e.message);
      return [];
    }
    console.log('[tree] querySourceFeatures 返回要素数:', feats ? feats.length : 0, 'zoom:', lmap.getZoom().toFixed(2));
    if (!feats || !feats.length) return [];
    const pts = [];
    for (const f of feats) {
      const g = f.geometry;
      if (g.type === 'Point') {
        pts.push(g.coordinates);
      } else if (g.type === 'Polygon') {
        scatterGrid(g.coordinates).forEach(p => pts.push(p));
      } else if (g.type === 'MultiPolygon') {
        for (const po of g.coordinates) scatterGrid(po).forEach(p => pts.push(p));
      }
    }
    console.log('[tree] 散点后树点数:', pts.length);
    if (pts.length > TOTAL_MAX) {
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      pts.length = TOTAL_MAX;
    }
    return pts;
  }

  // 加载三个 GLB 树模型
  function loadGLBModels() {
    const loader = new THREE.GLTFLoader();
    const tasks = MODEL_URLS.map(url => new Promise((resolve, reject) => {
      loader.load(url,
        g => {
          const meshes = [];
          g.scene.traverse(o => {
            if (o.isMesh) {
              meshes.push({ geometry: o.geometry, material: o.material });
            }
          });
          console.log('[tree] 模型加载:', url, 'meshes:', meshes.length);
          resolve({ meshes });
        },
        undefined,
        err => { console.error('[tree] 加载失败:', url, err); reject(err); }
      );
    }));
    return Promise.all(tasks);
  }

  function queryElev(lng, lat) {
    try {
      const e = lmap.queryTerrainElevation([lng, lat]);
      return (e == null || isNaN(e)) ? null : e;
    } catch (err) {
      return null;
    }
  }

  async function waitTerrainReady() {
    const c = lmap.getCenter();
    for (let i = 0; i < 40; i++) {
      const e = queryElev(c.lng, c.lat);
      if (e != null) return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }

  // 按当前视野中心重新查 wood 多边形、构建 treeData
  function rebuildTreeData() {
    const pts = loadTrees();
    if (!pts.length) return;
    const c = lmap.getCenter();
    originMerc = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0);
    const eastNorth = makeEastNative([c.lng, c.lat]);
    treeData = [];
    for (const [lng, lat] of pts) {
      const [e, n] = eastNorth(lng, lat);
      treeData.push({
        lng, lat, east: e, north: n,
        elev: queryElev(lng, lat),
        sc: 0.8 + Math.random() * 0.6,
        rotY: Math.random() * Math.PI * 2,
        v: (Math.random() * VARIANTS) | 0
      });
    }
  }

  async function main() {
    if (started) return;
    started = true;

    const ready = await waitTerrainReady();
    if (!ready) return;

    try {
      variants = await loadGLBModels();
    } catch (e) {
      console.error('[tree] GLB 模型加载失败，停止种树:', e);
      return;
    }

    layer = {
      id: 'trees-3d',
      type: 'custom',
      renderingMode: '3d',
      minzoom: TREE_MIN_ZOOM,
      onAdd(map, gl) {
        try {
          this.map = map;
          this.camera = new THREE.Camera();
          this.scene = new THREE.Scene();
          this.scene.rotateX(Math.PI / 2);
          this.scene.scale.multiply(new THREE.Vector3(1, 1, -1));

          // 灯光
          this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
          const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
          sun.position.set(300, 500, 200);
          sun.target.position.set(0, 0, 0);
          this.scene.add(sun);
          this.scene.add(sun.target);

          this.instanced = [];
          this.dummy = new THREE.Object3D();

          this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: false });
          this.renderer.autoClear = false;
        } catch (e) {
          console.error(e);
        }
      },
      buildInstances() {
        if (!this.scene) return;
        // 清理旧的实例网格
        if (this.instanced) {
          for (const arr of this.instanced) {
            if (!arr) continue;
            for (const m of arr) { if (m) { this.scene.remove(m); m.dispose(); } }
          }
        }
        this.instanced = [];

        const counts = new Array(VARIANTS).fill(0);
        for (const t of treeData) counts[t.v]++;
        console.log('[tree] buildInstances, treeData:', treeData.length, 'counts:', counts.join(','));
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
        this.applyMatrices();
        if (this.map) this.map.triggerRepaint();
      },
      applyMatrices() {
        if (!this.dummy || !this.instanced) return;
        const d = this.dummy;
        const idx = new Array(VARIANTS).fill(0);
        for (let i = 0; i < treeData.length; i++) {
          const t = treeData[i];
          const visible = t.elev != null;
          const s = visible ? t.sc : 0;
          const k = idx[t.v]++;
          d.position.set(t.east, (t.elev || 0), t.north);
          d.scale.set(s, s, s);
          d.rotation.set(0, t.rotY, 0);
          d.updateMatrix();
          if (this.instanced[t.v]) {
            for (const inst of this.instanced[t.v]) inst.setMatrixAt(k, d.matrix);
          }
        }
        for (const arr of this.instanced) {
          if (!arr) continue;
          for (const inst of arr) if (inst) inst.instanceMatrix.needsUpdate = true;
        }
      },
      render(gl, args) {
        if (!originMerc) return;
        const mm = Array.isArray(args)
          ? args
          : (args.defaultProjectionData ? args.defaultProjectionData.mainMatrix : args.projectionMatrix);
        const m = new THREE.Matrix4().fromArray(mm);
        const l = new THREE.Matrix4()
          .makeTranslation(originMerc.x, originMerc.y, originMerc.z)
          .scale(new THREE.Vector3(
            originMerc.meterInMercatorCoordinateUnits(),
            -originMerc.meterInMercatorCoordinateUnits(),
            originMerc.meterInMercatorCoordinateUnits()
          ));
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

    function updateHeights() {
      if (!lmap.getTerrain()) return;
      let changed = false;
      for (const t of treeData) {
        if (t.elev == null) {
          const e = queryElev(t.lng, t.lat);
          if (e == null) continue;
          t.elev = e;
          changed = true;
        } else {
          const e = queryElev(t.lng, t.lat);
          if (e == null) continue;
          if (Math.abs(e - t.elev) > 0.5) {
            t.elev = e;
            changed = true;
          }
        }
      }
      if (changed && layer && layer.applyMatrices) layer.applyMatrices();
    }
    lmap.on('idle', updateHeights);

    // 视野稳定后，按当前 zoom 重新查 wood 多边形、重建树
    function scheduleRebuild() {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!layer) return;
        const z = lmap.getZoom();
        if (z < TREE_MIN_ZOOM) {
          if (lastRebuildCount > 0) {
            treeData = [];
            lastRebuildCount = 0;
            layer.buildInstances();
          }
          return;
        }
        const c = lmap.getCenter();
        if (lastRebuildLng != null) {
          const dLat = c.lat - lastRebuildLat;
          const dLng = c.lng - lastRebuildLng;
          const distM = Math.sqrt((dLng * 111320 * Math.cos(c.lat * Math.PI / 180)) ** 2 + (dLat * 111320) ** 2);
          if (distM < 50) return;
        }
        rebuildTreeData();
        lastRebuildLng = c.lng;
        lastRebuildLat = c.lat;
        lastRebuildCount = treeData.length;
        layer.buildInstances();
        updateHeights();
      }, 300);
    }
    lmap.on('idle', scheduleRebuild);
    lmap.on('moveend', scheduleRebuild);

    // 初始触发一次
    rebuildTreeData();
    {
      const c = lmap.getCenter();
      lastRebuildLng = c.lng;
      lastRebuildLat = c.lat;
      lastRebuildCount = treeData.length;
    }
    if (layer.buildInstances) layer.buildInstances();
  }

  if (lmap.loaded && lmap.loaded()) {
    main();
  } else if (lmap.isStyleLoaded && lmap.isStyleLoaded()) {
    main();
  } else {
    lmap.once('load', main);
  }
}
