import { 基礎字對 } from './cvt/Characters.js';
import { 逕轉一對多字對, 微調字對 } from './cvt/Finetunes.js';

const _s2t = new Map(), _t2s = new Map();
for (const pair of [...基礎字對, ...逕轉一對多字對, ...微調字對]) {
	if (!pair || pair.length < 2) continue;
	_s2t.set(pair[0], pair[1]);
	_t2s.set(pair[1], pair[0]);
}
function toSimplified(str) {
	return String(str || '').split('').map((c) => _t2s.get(c) || c).join('');
}

const 廿四山 = ['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
export class Orienting {
	constructor(lmap, maplibregl){
		this.lmap = lmap; this.maplibregl = maplibregl;
		this.heading = null; this.orientationEnabled = false; this.arrow = null;
		this.geolocate = new maplibregl.GeolocateControl({positionOptions: {enableHighAccuracy: true},
			trackUserLocation: true
		});
		lmap.addControl(this.geolocate);
		// this.geolocate.on('geolocate', () => {
		// 	const ab = new DeviceOrientationEvent('deviceorientationabsolute');
		// 	if (ab.absolute) this.attachHeadingArrow();
		// });
		lmap.on('rotate', this.updateArrow);
		lmap.getContainer().querySelector('.maplibregl-ctrl-geolocate').addEventListener('click', () => {
			if (this.orientationEnabled) return;
			if (typeof DeviceOrientationEvent.requestPermission === 'function') {
				// must be from the user-initiated click
				DeviceOrientationEvent.requestPermission().then(permission => {
					if (permission === 'granted') {
						this.startOrientation();
					}
				}).catch(console.error);
			} else {
				this.startOrientation();
			}
		}, {capture: true}
		);
	}
	attachHeadingArrow(){
		const dot = this.lmap.getContainer().querySelector('.maplibregl-user-location-dot');
		if (!dot) return;
		if (!this.arrow || !dot.contains(this.arrow)) {
			dot.style.position = 'relative';
			this.arrow = document.createElement('div');
			this.arrow.className = 'user-heading-arrow';
			this.cmpsChar = document.createElement('div');this.cmpsChar.className = '針字';
			dot.appendChild(this.arrow);dot.appendChild(this.cmpsChar);
		}
		this.updateArrow();
	}
	updateArrow(){
		if (!this.arrow || this.heading === null) return;
		const angle = (this.heading - this.lmap.getBearing() + 360) % 360;
		this.arrow.style.transform = `rotate(${angle}deg)`;
		this.cmpsChar.innerHTML = 廿四山[Math.round(this.heading/15)%24];
	}
	startOrientation(){
		if (this.orientationEnabled) return;
		this.orientationEnabled = true;
		window.addEventListener('deviceorientationabsolute', event => {
			if (typeof event.alpha === 'number'){//event.absolute === true && 
				this.heading = (720 - event.alpha)% 360;
			} else {
				return;
			}
			// If the location dot is not available yet, wait for geolocate.
			if (!this.arrow) this.attachHeadingArrow();
			this.updateArrow();
		});
		window.addEventListener('deviceorientation', event => {
			if (typeof event.webkitCompassHeading === 'number'){
				this.heading = event.webkitCompassHeading;
			} else {
				return;
			}
			if (!this.arrow) this.attachHeadingArrow();
			this.updateArrow();
		});
	}
}

function _haversine(lat1, lng1, lat2, lng2) {
	const R = 6_371_000.0;
	const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180;
	const dp = (lat2 - lat1) * Math.PI / 180, dl = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

// 驾车可通行的车行道类别
const DRIVEABLE = new Set([
	"motorway", "trunk", "primary", "secondary", "tertiary", "residential",
	"unclassified", "living_street", "service",
	"motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"
]);

// 路线导航
export class RouteNavigation {
	constructor(lmap, maplibregl) {
		this.lmap = lmap;
		this.maplibregl = maplibregl;
		this.network = null;
		this.places = [];
		this.walkAdj = {};    // 步行：全量道路
		this.driveAdj = {};   // 驾车：仅车行道 + 咬合短边
		this.driveNodes = new Set();
		this.driveMain = new Set();  // 车行主连通分量（主网）
		this.sourceId = "route-source";
		this.casingLayer = "route-casing";
		this.lineLayer = "route-line";
		this.markers = [];
	}

	// 加载路网
	async load(networkUrl) {
		const net = await fetch(networkUrl).then((r) => { if (!r.ok) throw new Error(networkUrl); return r.json(); });
		this.network = net;
		this.places = net.places || [];
		this._buildAdj();
	}

	_buildAdj() {
		this.walkAdj = {};
		this.driveAdj = {};
		this.driveNodes = new Set();
		for (const [u, v, len, hw] of this.network.edges) {
			(this.walkAdj[u] = this.walkAdj[u] || []).push([v, len]);
			if (DRIVEABLE.has(hw) || hw === "link") {
				(this.driveAdj[u] = this.driveAdj[u] || []).push([v, len]);
				this.driveNodes.add(u);
				this.driveNodes.add(v);
			}
		}
		this._snapDrive(12.0);            // 车行近邻咬合，把碎片支路并入主网
		this.driveMain = this._computeDriveMain();  // 求车行主连通分量
	}

	// 车行近邻咬合
	_snapDrive(thresh) {
		const cell = 0.00012; 
		const grid = new Map();
		const bucket = (la, lo) => `${Math.round(la / cell)},${Math.round(lo / cell)}`;
		for (const n of this.driveNodes) {
			const [lo, la] = this.network.nodes[n];
			const k = bucket(la, lo);
			if (!grid.has(k)) grid.set(k, []);
			grid.get(k).push(n);
		}
		const seen = new Set();
		for (const [k, members] of grid) {
			const [gx, gy] = k.split(",").map(Number);
			for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
				const neigh = grid.get(`${gx + dx},${gy + dy}`);
				if (!neigh) continue;
				for (const a of members) for (const b of neigh) {
					if (a === b) continue;
					const key = a < b ? `${a}|${b}` : `${b}|${a}`;
					if (seen.has(key)) continue;
					seen.add(key);
					const [loA, laA] = this.network.nodes[a];
					const [loB, laB] = this.network.nodes[b];
					const d = _haversine(laA, loA, laB, loB);
					if (d > thresh) continue;
					if (!(this.driveAdj[a] || []).some(([x]) => x === b)) {
						(this.driveAdj[a] = this.driveAdj[a] || []).push([b, d]);
						(this.driveAdj[b] = this.driveAdj[b] || []).push([a, d]);
						this.driveNodes.add(a); this.driveNodes.add(b);
					}
				}
			}
		}
	}

	// 求车行无向图最大连通分量
	_computeDriveMain() {
		const visited = new Set();
		let main = new Set();
		for (const start of this.driveNodes) {
			if (visited.has(start)) continue;
			const comp = new Set();
			const q = [start];
			visited.add(start);
			while (q.length) {
				const u = q.pop();
				comp.add(u);
				for (const [v] of (this.driveAdj[u] || [])) {
					if (!visited.has(v)) { visited.add(v); q.push(v); }
				}
			}
			if (comp.size > main.size) main = comp;
		}
		return main;
	}

	// 地名模糊匹配
	matchPlaces(keyword) {
		const k = String(keyword || "").trim().toLowerCase();
		if (!k) return [];
		const kS = toSimplified(k);
		return this.places.filter((p) => {
			const nm = p.name.toLowerCase();
			const ns = (p.name_s || "").toLowerCase();
			return nm.includes(k) || ns.includes(kS) || toSimplified(nm).includes(kS);
		});
	}

	_nearestNode(lng, lat, candidates) {
		let best = null, bestD = Infinity;
		const ids = candidates || Object.keys(this.network.nodes);
		for (const id of ids) {
			const [nLng, nLat] = this.network.nodes[id];
			const d = _haversine(lat, lng, nLat, nLng);
			if (d < bestD) { best = id; bestD = d; }
		}
		return best;
	}

	// 二叉堆辅助
	_heapPush(heap, item) {
		heap.push(item);
		let i = heap.length - 1;
		while (i > 0) {
			const parent = (i - 1) >> 1;
			if (heap[parent][0] <= heap[i][0]) break;
			[heap[parent], heap[i]] = [heap[i], heap[parent]];
			i = parent;
		}
	}
	_heapPop(heap) {
		const top = heap[0];
		const last = heap.pop();
		if (heap.length) { heap[0] = last; this._siftDown(heap, 0); }
		return top;
	}
	_siftDown(heap, i) {
		const n = heap.length;
		while (true) {
			const l = i * 2 + 1, r = l + 1;
			let min = i;
			if (l < n && heap[l][0] < heap[min][0]) min = l;
			if (r < n && heap[r][0] < heap[min][0]) min = r;
			if (min === i) break;
			[heap[min], heap[i]] = [heap[i], heap[min]];
			i = min;
		}
	}

	// Dijkstra：在指定邻接表上求最短路，返回 { path, dist }；不可达返回 null
	_dijkstra(adj, src, dst) {
		const dist = {}, prev = {}, settled = new Set();
		const heap = [[0, src]];
		dist[src] = 0;
		while (heap.length) {
			const [d, u] = this._heapPop(heap);
			if (settled.has(u)) continue;
			settled.add(u);
			if (u === dst) break;
			for (const [v, w] of (adj[u] || [])) {
				const nd = d + w;
				if (dist[v] === undefined || nd < dist[v]) {
					dist[v] = nd;
					prev[v] = u;
					this._heapPush(heap, [nd, v]);
				}
			}
		}
		if (dist[dst] === undefined) return null;
		const path = [];
		let cur = dst;
		while (cur !== undefined) { path.push(cur); cur = prev[cur]; }
		return { path: path.reverse(), dist: dist[dst] };
	}

	_pickNode(lng, lat, drive) {
		if (!drive) return this._nearestNode(lng, lat, null);
		for (const pool of [this.driveMain, this.driveNodes, null]) {
			const n = this._nearestNode(lng, lat, pool);
			if (n) return n;
		}
		return null;
	}

	planRoute(nameA, nameB, mode = "walk") {
		const a = this.matchPlaces(nameA)[0];
		const b = this.matchPlaces(nameB)[0];
		if (!a) return { ok: false, reason: `找不到起点「${nameA}」` };
		if (!b) return { ok: false, reason: `找不到终点「${nameB}」` };

		const drive = mode === "drive";
		const adj = drive ? this.driveAdj : this.walkAdj;
		const s = this._pickNode(a.lng, a.lat, drive);
		const t = this._pickNode(b.lng, b.lat, drive);
		let res = this._dijkstra(adj, s, t);
		let fallback = false;
		if (!res && drive) {
			res = this._dijkstra(this.walkAdj, s, t);
			fallback = true;
		}
		if (!res) return { ok: false, reason: drive ? "驾车不可达（附近没有车行道）" : "两点在路网中不可达" };

		this._renderRoute(res.path);
		return {
			ok: true,
			path: res.path,
			length: Math.round(res.dist * 10) / 10,
			start: a.name,
			end: b.name,
			mode: fallback ? "步行(车行不可达)" : (drive ? "驾车" : "步行"),
			fallback
		};
	}

	_renderRoute(path) {
		this._clearRoute();
		const coords = path.map((id) => this.network.nodes[id]);
		const geojson = {
			type: "FeatureCollection",
			features: [{
				type: "Feature",
				geometry: { type: "LineString", coordinates: coords },
				properties: { nodes: path.length }
			}]
		};
		if (this.lmap.getSource(this.sourceId)) {
			this.lmap.getSource(this.sourceId).setData(geojson);
		} else {
			this.lmap.addSource(this.sourceId, { type: "geojson", data: geojson });
		}
		// 白色描边底层，增强路线辨识度
		this.lmap.addLayer({
			id: this.casingLayer,
			type: "line",
			source: this.sourceId,
			layout: { "line-join": "round", "line-cap": "round" },
			paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 }
		});
		// 主路线
		this.lmap.addLayer({
			id: this.lineLayer,
			type: "line",
			source: this.sourceId,
			layout: { "line-join": "round", "line-cap": "round" },
			paint: { "line-color": "#EA6668", "line-width": 3.5 }
		});
		// 起点绿、终点橙
		const start = coords[0], end = coords[coords.length - 1];
		this.markers.push(new this.maplibregl.Marker({ color: "#52C41A" }).setLngLat(start).addTo(this.lmap));
		this.markers.push(new this.maplibregl.Marker({ color: "#FAAD14" }).setLngLat(end).addTo(this.lmap));
		this._fitBounds(coords);
	}

	_fitBounds(coords) {
		const bounds = new this.maplibregl.LngLatBounds();
		coords.forEach((c) => bounds.extend(c));
		this.lmap.fitBounds(bounds, { padding: 60, maxZoom: 17 });
	}

	_clearRoute() {
		const lmap = this.lmap;
		[this.lineLayer, this.casingLayer].forEach((id) => {
			if (lmap.getLayer(id)) lmap.removeLayer(id);
		});
		if (lmap.getSource(this.sourceId)) lmap.removeSource(this.sourceId);
		this.markers.forEach((m) => m.remove());
		this.markers = [];
	}
}
