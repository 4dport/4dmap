if (/\sQQ|micromessenger/i.test(navigator.userAgent.toLowerCase())){
	let 全遮板 = document.createElement("div");
	全遮板.style.cssText = "writing-mode:vertical-rl; position:fixed; z-index:900; height:100vh; width:100vw; top:0; left:0; background-color:#333; color:#ccc; font-size:8vh; line-height:100vw; letter-spacing:2vh; text-align:center";
	全遮板.innerHTML = '請以瀏覽器啓視';
	document.body.appendChild(全遮板);
}
import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.15.0/dist/maplibre-gl.mjs';
import { TerminatorLayer } from "./terminator-layer.js";
// import { addTreeTerrainLayer } from "./tree-terrain-layer.js";
import { 轉瓦內字 } from './cvt/cc.js';
const pmProtocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles',pmProtocol.tile);
const PMTILES_NAME = ['鄉以上地點','中國无港澳臺海域','中國政區界','海深','公海和南極'];
const TILES_LOC = 'https://pub-76f7e7fbf50f4423b85486dda0feb0c9.r2.dev/瓦/';
for (const pmtilesUrl of PMTILES_NAME){
	const p = new pmtiles.PMTiles(TILES_LOC + pmtilesUrl +'.pmtiles');
	pmProtocol.add(p);
}
const ccProtocol = '轉正';
maplibregl.addProtocol(ccProtocol, (request) => {
	const url = request.url.replace(ccProtocol + '://', '');
	return 轉瓦內字(url);
});
// maplibregl.addProtocol('cog', MaplibreCOGProtocol.cogProtocol);
var 圖央 = [localStorage.getItem("經度"), localStorage.getItem("緯度")], 初縮放 = localStorage.getItem("縮放級");
if(圖央.some(d=>d==undefined)){
	圖央 = [112.45, 34.67];
} else {
	圖央 = 圖央.map(x=>Number(x));
}
if(初縮放==undefined){
	初縮放 = 12;
} else {
	初縮放 = Number(初縮放);
	if(初縮放<1){ 初縮放 = 1;}
}
localStorage.removeItem("經度");localStorage.removeItem("緯度");
export const lmap = new maplibregl.Map({
	container: 'map',
	zoom: 初縮放, center: 圖央, pitch: 0,
	hash: false, canvasContextAttributes: {antialias: true},
	style: {
		version: 8,
		sources: {
			蹤迹:{
				type: 'raster',
				tiles: [備選底圖["蹤迹"]["url"]],
				tileSize: 256, attribution: '&copy; 蹤迹平面', maxzoom: 19
			},
			天地圖:{
				type: 'raster',
				tiles: [備選底圖["天地圖"]["url"]],
				tileSize: 256
			},
			製圖師亮:{
				type: 'raster',
				tiles: [備選底圖["製圖師亮"]["url"]],
				tileSize: 256
			},
			製圖師暗:{
				type: 'raster',
				tiles: [備選底圖["製圖師暗"]["url"]],
				tileSize: 256
			},
			雄蕊:{
				type: 'raster',
				tiles: [備選底圖["雄蕊"]["url"]],
				tileSize: window.devicePixelRatio>1.5 ? 512 : 256
			},
			// Use a different source for terrain and hillshade layers, to improve render quality
			terrainSource: {
				type: 'raster-dem',
				url: 'https://tiles.mapterhorn.com/tilejson.json'
			},
			hillshadeSource: {
				type: 'raster-dem',
				url: 'https://tiles.mapterhorn.com/tilejson.json'
			},
			海底高程: {
				type: 'raster-dem',
				url: `pmtiles://${TILES_LOC}海深.pmtiles`,
				tileSize: 256, encoding: "terrarium"
			},
			鄉以上地點: {
				type: 'vector',
				// url: 'http://localhost:8080/data/鄉以上地點.json'//mbtiles
				url: `pmtiles://${TILES_LOC}鄉以上地點.pmtiles`
			},
			中國政區界綫: {
				type: 'vector',
				// url: 'http://localhost:8080/data/中國政區界.json'
				url: `pmtiles://${TILES_LOC}中國政區界.pmtiles`
			},
			開放免費地圖: {
				type: 'vector',
				url: 'https://tiles.openfreemap.org/planet'
			},
			經綫: {
				type: 'geojson',
				data: {
					"type": "FeatureCollection",
					"features": 畫經綫()
				}
			},
			特殊緯綫: {
				type: 'geojson',
				data: {
					"type": "FeatureCollection",
					"features": 畫赤道和歸極綫()
				}
			},
			普通緯綫: {
				type: 'geojson',
				data: {
					"type": "FeatureCollection",
					"features": 畫普通緯綫()
				}
			},
			中國除港澳臺外之海域: {
				type: 'vector', url: `pmtiles://${TILES_LOC}中國无港澳臺海域.pmtiles`
			},
			公海和南極: {
				type: 'vector', url: `pmtiles://${TILES_LOC}公海和南極.pmtiles`
			}
		},
		layers: 諸層,
		terrain: {
			source: 'terrainSource',
			exaggeration: 1
		},
		// light: {"anchor": "map", "color": "#fff", "position": [1.4, -180, 90], "intensity": 0.1},
		sky: {"sky-color":"hsl(197, 71%, 63%)", "horizon-color":"hsl(213, 76%, 65%)", "atmosphere-blend": 0.25},
		projection: {"type": "globe"}
	},
	minZoom: 1, maxZoom: 21, maxPitch: 85
});
lmap.on('style.load', () => {
	let 昏旦 = new TerminatorLayer({updateInterval: 30000});
	const layers = lmap.getStyle().layers;
	const firstSymbol = layers.find(layer => layer.type === "symbol");
	lmap.addLayer(昏旦, firstSymbol?.id);
});
lmap.on('zoom', () => {
	const z = lmap.getZoom();
	var 傾極 = (z-6)/7*85;
	if (傾極 < 0){ 傾極 = 0;}
	else if (傾極 > 85){ 傾極 = 85;}
	lmap.setMaxPitch(傾極);
});
lmap.addControl(new maplibregl.FullscreenControl());
lmap.addControl(
	new maplibregl.NavigationControl({
		visualizePitch: true,
		showZoom: true,
		showCompass: true
	})
);
lmap.addControl(
	new maplibregl.TerrainControl({
		source: 'terrainSource',
		exaggeration: 1
	})
);
lmap.setTransformRequest((url, resourceType) => {
	if (url.startsWith('https://tiles.openfreemap.org/') && resourceType === 'Tile') {
		return { url: ccProtocol + '://' + url };
	}
	return undefined;
});
// 測底圖延遟(lmap, true);
setInterval(() => 測底圖延遟(lmap), 10000);
setTimeout(測瓦服務器延遟, 5000);
document.getElementById("底圖選單").addEventListener('change',function(){
	const 所選值 = this.selectedOptions[0].value;
	if (所選值=='无'){
		lmap.setLayoutProperty('底圖','visibility','none');
	} else {
		lmap.setLayoutProperty('底圖','visibility','visible');
		易圖層源(lmap, 所選值);
	}
});
lmap.on('moveend',()=>{
	localStorage.setItem("經度", lmap.getCenter().lng.toString());
	localStorage.setItem("緯度", lmap.getCenter().lat.toString());
});
lmap.on('zoomend',()=>{
	localStorage.setItem("縮放級", lmap.getZoom().toString());
});
// addTreeTerrainLayer(lmap);