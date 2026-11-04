export function addTreeTerrainLayer(lmap, maplibregl) {
  if (typeof THREE === 'undefined') return;
  if (!THREE.GLTFLoader) {
    console.warn('[tree] THREE.GLTFLoader 未加载');
    return;
  }

  const TOTAL_MAX = 10000;   // 视野内树数上限
  const GRID_M = 20;         // 网格树距（米）
  const JITTER_M = 3;       // 每棵树极坐标随机偏移最大距离（米）
  const VARIANTS = 3;       // 树模型变体数

  const MODEL_URLS = [
    'models/tree-deciduous-a.glb',
    'models/tree-deciduous-b.glb',
    'models/tree-evergreen.glb'
  ];

  let treeData = [];
  let grownCells = new Set();   // 已长过树的格子 key = "gx,gy"
  let started = false;
  let variants = null;
  let originMerc = null;        // 固定局部原点 mercator 坐标（初始化后不再变）
  let originLng = 0, originLat = 0;
  let layer = null;
  let refreshTimer = null;
  const TREE_MIN_ZOOM = 17;

  // ---- 确定性哈希：同一格子每次生成的随机参数完全一致 ----
  function hash2(gx, gy, salt) {
    let h = (gx * 374761393) ^ (gy * 668265263) ^ (salt * 982451653);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  }

  // 经纬度 -> 相对固定原点的米制偏移 [east, north]
  function toEastNorth(lng, lat) {
    const m = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], 0);
    const unit = originMerc.meterInMercatorCoordinateUnits();
    return [(m.x - originMerc.x) / unit, (originMerc.y - m.y) / unit];
  }
  // 米制偏移 -> 经纬度
  function toLngLat(e, n) {
    const mLon = 111320 * Math.cos(originLat * Math.PI / 180);
    return [originLng + e / mLon, originLat + n / 111320];
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

  function loadGLBModels() {
    const loader = new THREE.GLTFLoader();
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

  // 给单个网格点长一棵树（参数由 hash 决定，确定性）
  function pushTree(gx, gy) {
    const ang = hash2(gx, gy, 0) * Math.PI * 2 - Math.PI;
    const rad = hash2(gx, gy, 1) * JITTER_M;
    const e = gx + rad * Math.cos(ang);
    const n = gy + rad * Math.sin(ang);
    const [lng, lat] = toLngLat(e, n);
    treeData.push({
      gx, gy, east: e, north: n,
      lng, lat,
      elev: queryElev(lng, lat),
      sc: 0.8 + hash2(gx, gy, 2) * 0.6,
      rotY: hash2(gx, gy, 3) * Math.PI * 2,
      v: Math.floor(hash2(gx, gy, 4) * VARIANTS)
    });
  }

  // 从一个多边形里长新树（跳过已长过的格子）
  function growFromPolygon(co) {
    const outer = co[0].map(([lng, lat]) => toEastNorth(lng, lat));
    const holes = co.slice(1).map(h => h.map(([lng, lat]) => toEastNorth(lng, lat)));

    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of outer) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }

    let added = 0;
    const gxStart = Math.floor(x0 / GRID_M) * GRID_M;
    const gyStart = Math.floor(y0 / GRID_M) * GRID_M;
    for (let gx = gxStart; gx <= x1; gx += GRID_M) {
      for (let gy = gyStart; gy <= y1; gy += GRID_M) {
        if (!inPolyMeters(gx, gy, outer, holes)) continue;
        const key = gx + ',' + gy;
        if (grownCells.has(key)) continue;
        grownCells.add(key);
        pushTree(gx, gy);
        added++;
      }
    }
    return added;
  }

  // 增量：在当前视野内长新树，回收远处的树
  function growTreesInView() {
    if (!originMerc) return;
    const z = lmap.getZoom();
    if (z < TREE_MIN_ZOOM) return;

    let feats;
    try {
      feats = lmap.querySourceFeatures('開放免費地圖', {
        sourceLayer: 'landcover',
        filter: ['==', ['get', 'class'], 'wood']
      });
    } catch (e) {
      return;
    }
    if (!feats || !feats.length) return;

    let added = 0;
    for (const f of feats) {
      const g = f.geometry;
      if (g.type === 'Polygon') {
        added += growFromPolygon(g.coordinates);
      } else if (g.type === 'MultiPolygon') {
        for (const po of g.coordinates) added += growFromPolygon(po);
      }
    }

    // 回收：动态算回收半径 = 当前视野对角线 × 2
    // 这样屏幕上能看到的树（离中心最远 = 对角线/2）永远不会被删
    const c = lmap.getCenter();
    const [curE, curN] = toEastNorth(c.lng, c.lat);
    const b = lmap.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const [swE, swN] = toEastNorth(sw.lng, sw.lat);
    const [neE, neN] = toEastNorth(ne.lng, ne.lat);
    const diagM = Math.sqrt((neE - swE) ** 2 + (neN - swN) ** 2);
    const recycleR = diagM * 2;  // 视野对角线 × 2
    const recycleR2 = recycleR * recycleR;

    const before = treeData.length;
    treeData = treeData.filter(t => {
      const d2 = (t.east - curE) ** 2 + (t.north - curN) ** 2;
      if (d2 > recycleR2) {
        grownCells.delete(t.gx + ',' + t.gy);
        return false;
      }
      return true;
    });

    // 超 TOTAL_MAX：按距离排序，只留最近的 TOTAL_MAX 棵
    if (treeData.length > TOTAL_MAX) {
      treeData.sort((a, b) => {
        const da = (a.east - curE) ** 2 + (a.north - curN) ** 2;
        const db = (b.east - curE) ** 2 + (b.north - curN) ** 2;
        return da - db;
      });
      const removed = treeData.slice(TOTAL_MAX);
      for (const t of removed) grownCells.delete(t.gx + ',' + t.gy);
      treeData.length = TOTAL_MAX;
    }

    const recycled = before - treeData.length;
    if (added > 0 || recycled > 0) {
      if (layer && layer.onTreesChanged) layer.onTreesChanged();
      console.log('[tree] 新增 +' + added + ' 回收 ' + recycled + ' 总数 ' + treeData.length);
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

    // 初始化固定坐标系（只做一次，之后 origin 不再随平移变化）
    const c = lmap.getCenter();
    originLng = c.lng;
    originLat = c.lat;
    originMerc = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0);

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
      // 树数据变化后：判断是否需要扩容重建，否则只重写 instanceMatrix
      onTreesChanged() {
        if (!this.scene) return;
        const counts = new Array(VARIANTS).fill(0);
        for (const t of treeData) counts[t.v]++;

        let needRebuild = false;
        for (let v = 0; v < VARIANTS; v++) {
          if (counts[v] > this.capacityPerVariant[v]) needRebuild = true;
        }

        if (needRebuild) {
          // 销毁旧的 InstancedMesh
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
            for (const inst of this.instanced[t.v]) {
              inst.setMatrixAt(k, d.matrix);
              inst.count = idx[t.v];
            }
          }
        }
        for (const arr of this.instanced) {
          if (!arr) continue;
          for (const inst of arr) if (inst) inst.instanceMatrix.needsUpdate = true;
        }
      },
      render(gl, args) {
        if (!originMerc) return;
        if (lmap.getZoom() < TREE_MIN_ZOOM) return;
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

    // 高程更新：只处理 elev 还没取到的新树
    function updateHeights() {
      if (!lmap.getTerrain()) return;
      let changed = false;
      for (const t of treeData) {
        if (t.elev == null) {
          const e = queryElev(t.lng, t.lat);
          if (e == null) continue;
          t.elev = e;
          changed = true;
        }
      }
      if (changed && layer && layer.applyMatrices) layer.applyMatrices();
    }
    lmap.on('idle', updateHeights);

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
