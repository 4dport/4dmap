const 備選底圖 = {
	"製圖師亮":{
		'url' : 'http://0.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png?key=cb1_2rwh_1_4cc762fc5c853e92b7c2e3f1'
	},"製圖師暗":{
		'url' : 'http://0.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png?key=cb1_2rwh_1_4cc762fc5c853e92b7c2e3f1'
	},"雄蕊":{
		'url': "https://tiles.stadiamaps.com/tiles/stamen_terrain_background/{z}/{x}/{y}"+(window.devicePixelRatio>1.5 ? "@2x":"")+".png"
	},"蹤迹":{
		'url': 'https://tile.tracestrack.com/base/{z}/{x}/{y}.png?key=c9b06c7e3f6edfd81737634530fdb75a'
	},"天地圖":{
		'url': "https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=93c7cba7a04d9b86d08e058d5451982f"
	}
};
var 選中底圖 = '';
async function testFetchLatency(url, bearTime=4000) {
	const start = performance.now();
	try {
		const res = await fetch(`${url}${url.includes('?')?'&':'?'}_t=${Date.now()}`, {
			method: "GET", // HEAD 只取標頭，不下載完整內容
			signal: AbortSignal.timeout(bearTime)
		});
		if (res.ok) {
			return performance.now() - start;
		}
		return null;// 逾時
	} catch {
		return null;// 出錯
	}
}
function 易圖層源(mymap, newsource){
	const oldLayers = mymap.getStyle().layers;
	const layerIndex = oldLayers.findIndex(l => l.id==="底圖");
	const layerDef = oldLayers[layerIndex];
	const before = oldLayers[layerIndex+1] && oldLayers[layerIndex+1].id;
	layerDef.source = newsource;
	mymap.removeLayer("底圖");
	mymap.addLayer(layerDef, before);
}
function 測底圖延遟(mymap, 易源=false){
	let 諸選項 = document.getElementById("底圖選單").options;
	for (const 底圖 in 備選底圖){
		testFetchLatency(備選底圖[底圖]["url"].replace('{x}','10').replace('{y}','20').replace('{z}','5')).then(r=>{
			備選底圖[底圖]["響應時長"] = r;
			let 該底圖選項 = document.getElementById("底圖選單").querySelector(`option[value="${底圖}"]`);
			該底圖選項.dataset.latency = r;
			該底圖選項.text = 該底圖選項.text.replace(/[⚫️🔴🟡🟢]/ug,'');
			if (r==null){
				該底圖選項.text = '⚫️'+ 該底圖選項.text;
				該底圖選項.title = '連不上';
			} else if (r>1500){
				該底圖選項.text = '🔴'+ 該底圖選項.text;
				該底圖選項.title = '慢（'+ String(Math.round(r/10))+'）';
			} else if (r>800){
				該底圖選項.text = '🟡'+ 該底圖選項.text;
				該底圖選項.title = '中（'+ String(Math.round(r/10))+'）';
			} else {
				該底圖選項.text = '🟢'+ 該底圖選項.text;
				該底圖選項.title = '快（'+ String(Math.round(r/10))+'）';
			}
			if (r!=null && (選中底圖=='' || 易源)){
				易源 = false;
				選中底圖 = 底圖;
				易圖層源(mymap, 選中底圖);
				for (let i=0; i<諸選項.length; i++){
					if (諸選項[i].value==選中底圖){
						諸選項[i].selected = true; break;
					}
				}
			}
		});
	}
}
function 測瓦服務器延遟(){
	const servers = {"雲耀":"https://pub-76f7e7fbf50f4423b85486dda0feb0c9.r2.dev/","Neocities":"https://vert.neocities.org/m/"};
	for (const server in servers){
		testFetchLatency(servers[server]+'nst.webp', 10000).then(r=>{
			console.log(server,r);
		});
	}
}