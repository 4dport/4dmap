const 黃赤交角 = 23.61749516;
function 作緯綫(緯度=0){
	const 坐標列 = [[-180,緯度],[180,緯度]];
	return 坐標列;
}
function 畫赤道和歸極綫(){
	const 特殊緯度 = {"赤道": 0, "北回歸綫": 黃赤交角, "南回歸綫": -黃赤交角, "北極圈": 90-黃赤交角, "南極圈": 黃赤交角-90};
	var 特殊緯綫 = [];
	for (const 緯綫名 in 特殊緯度){
		const 坐標列 = 作緯綫(特殊緯度[緯綫名]);
		const 綫要素 = {"type":"Feature","properties":{"name":緯綫名},"geometry":{"type":"LineString","coordinates":坐標列}};
		特殊緯綫.push(綫要素);
	}
	return 特殊緯綫;
}
function 畫普通緯綫(隔=15){
	var 緯綫集 = [];
	for (let n=1; n*隔<90; n++){
		var 坐標列 = 作緯綫(n*隔);
		var 綫要素 = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":坐標列}};
		緯綫集.push(綫要素);
		坐標列 = 作緯綫(-n*隔);
		綫要素 = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":坐標列}};
		緯綫集.push(綫要素);
	}
	return 緯綫集;
}
function 畫經綫(隔=15){
	var 經綫集 = [];
	for (let l=-180+隔; l<=180; l+=隔){
		const 綫要素 = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[l,-90],[l,90]]}};
		經綫集.push(綫要素);
	}
	return 經綫集;
}
const 臺灣外圍 = [[121,25.7],[118.8,23.6],[119.6,21.5],[121.7,21.5],[122.6,25],[121,25.7]];
const 黑體 = ["Noto Sans CJK KR","等线","微軟正黑體","黑体"];
const 膚廓體 = ["南監體","統刊朙","Noto Serif CJK KR","宋体"];
const 隸書 = ["漢文隸書","隶书"];
const 語文候補列 = ["coalesce", ["get","name:zh-Hant"],["get","name:zh"],["get","name:ko-Hani"],["get","name"],["get","name:ja"]];
const 色 = {"馳道":["interpolate",["linear"],["zoom"],15,"#fc8",17,"hsl(211, 30%, 55%)"], "幹路":"hsl(211, 30%, 65%)", "一級路":"hsl(208, 24%, 70%)", "二級路":"hsl(208, 15%, 70%)", "三級路":"hsl(208, 15%, 70%)", "局域路":"hsl(208, 15%, 90%)", "巷":"#fff", "步道": "hsl(30, 35%, 73%)",
	"馳道緣":["interpolate",["linear"],["zoom"],15,"#e9ac77",17,"hsl(8, 72%, 60%)"], "幹路緣":"hsl(8, 72%, 69%)", "一二三級路緣":"hsl(211, 30%, 45%)", "局域路緣":"hsl(208, 5%, 70%)", "巷緣": "#cfcdca",
	"邑軌":"#bbb", "長途軌":"#555", "軌間":"#fff"
};
const 路寬 = {"馳":["interpolate",["exponential", 1.2],["zoom"],
		6.5,0, 7,0.5, 20,18
	], "幹":["interpolate",["exponential", 1.2],["zoom"],
		6.5,0, 7,0.5, 20,18
	], "一級":["interpolate",["exponential", 1.2],["zoom"],
		8.5,0, 9,0.5, 20,18
	], "二級":["interpolate",["exponential", 1.2],["zoom"],
		6.5,0, 8,0.5, 20,13
	], "三級":["interpolate",["exponential", 1.2],["zoom"],
		7.5,0, 9,0.5, 20,12
	], "聮":["interpolate",["exponential", 1.2],["zoom"],
		12.5,0, 13,1.5, 14,2.5, 20,11.5
	], "局域":["interpolate",["exponential", 1.2],["zoom"],
		13.5,0, 14,2.5, 20,11.5
	], "巷":["interpolate",["exponential", 1.2],["zoom"],
		15.5,0, 16,2, 20,7.5
	], "步":["interpolate",["exponential", 1.2],["zoom"],
		15,1.2, 20,4
	], "軌內":["interpolate",["exponential", 1.3],["zoom"],
		12,2, 20,6
	], "軌外":["interpolate",["exponential", 1.3],["zoom"],
		12,3, 20,7
	]};
const 共樣式 = {
	鄉點:{
		layout: {
			"text-field": ["step", ["zoom"], ["get", "實專名"], 10, ["concat",["get", "實專名"],["get", "通名"]]],
			"text-font": ["step", ["zoom"], ["literal", 黑體], 12, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 7,10, 10,12, 19,24],
			"text-writing-mode": ["vertical"],
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "#111111",
			"text-halo-color": "#ffffff",
			"text-opacity": ["interpolate", ["linear"], ["zoom"], 7,0.3, 8.5,1],
			"text-halo-width": 1
		}
	},
	縣點:{
		layout: {
			"text-field": ["step", ["zoom"], ["get", "實專名"], 8, ["concat",["get", "實專名"],["get", "通名"]]],
			"text-font": ["step", ["zoom"], ["literal", 黑體], 10, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 8,14, 16,26],
			"text-max-width":9,
			"text-writing-mode": ["vertical"],
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "#000",
			"text-halo-color": "#ffe",
			"text-opacity": ["interpolate", ["linear"], ["zoom"], 6,0.3, 8,1],
			"text-halo-width": 1.5
		}
	},
	省轄縣點: {
		paint: {
			"text-color": "#000",
			"text-halo-color": "#fff",
			"text-opacity": ["interpolate", ["linear"], ["zoom"], 5,0.1, 6,0.5, 7.3,1],
			"text-halo-width": 2
		}
	},
	郡點:{
		paint: {
			"text-color": "#000",
			"text-halo-color": "#fff",
			"text-halo-width": ["interpolate", ["linear"], ["zoom"], 5,1, 8,2.5]
		}
	},
	省點:{},
	國點:{
		layout: {
			"text-field": ["step", ["zoom"], ["get", "實專名"], 8, ["concat",["get", "實專名"],["get", "通名"]]],
			"text-font": ["step", ["zoom"], ["literal", 黑體], 8, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,30],
			"text-writing-mode": ["vertical"],
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "#b11",
			"text-halo-color": "#fdd10f",
			"text-halo-width": 0.8
		}
	},
	國界粗綫:{
		layout: {"line-cap": "round", "line-join": "round"},
		paint: {
			"line-color": "hsla(270,70%,66%,0.5)",
			"line-opacity": ["interpolate",["linear"],["zoom"],
				1,0, 4,1
			],
			"line-width": ["interpolate",["linear"],["zoom"],
				3,4, 12,7
			]
		}
	},
	國界中心綫:{
		layout: {"line-cap": "round", "line-join": "round"},
		paint: {
			"line-color": "#c19",
			"line-opacity": ["interpolate",["linear"],["zoom"],
				1,0.4, 4,1
			],
			"line-width": ["interpolate",["linear"],["zoom"],
				3,1, 12,3
			]
		}
	},
	中國省界:{
		paint: {
			"line-color": "hsl(270,70%,36%)",
			"line-dasharray": [7,2,1,2],
			"line-width": ["interpolate",["linear"],["zoom"], 4,1, 11,3]
		}
	},
	郡界:{
		paint: {
			"line-color": "hsl(270,70%,36%)",
			"line-dasharray": [6,2,1,2,1,2],
			"line-width": ["interpolate",["linear"],["zoom"], 6,1, 12,3]
		}
	},
	縣界:{
		paint: {
			"line-color": "hsl(270,70%,36%)",
			"line-dasharray": [5,2,1,2,1,2,1,2],
			"line-width": ["interpolate",["linear"],["zoom"], 8,1, 14,2]
		}
	},
	半島:{
		layout: {
			"text-field": ["get", "轉換正名"],
			"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,30],
			"text-writing-mode": ["vertical"],
			"text-rotation-alignment": "map",// 隨圖轉
			"text-allow-overlap": true,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "rgba(32,32,32,0.7)",
			"text-halo-color": "rgba(240,240,240,0.5)",
			"text-halo-width": ["interpolate", ["linear"], ["zoom"], 5,1, 8,2.5]
		}
	},
	島礁:{
		layout: {
			"text-field": ["get", "轉換正名"],
			"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W4","隶书"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 8,13, 18,18],
			"text-writing-mode": ["vertical"],
			"text-rotation-alignment": "map",// 隨圖轉
			"text-allow-overlap": false,
			"text-ignore-placement": false
		}
	},
	群島:{
		layout: {
			"text-field": ["get", "轉換正名"],
			"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,20],
			"text-writing-mode": ["vertical"],
			"text-rotation-alignment": "map",// 隨圖轉
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "#000",
			"text-halo-color": "rgba(240,240,240,0.8)",
			"text-halo-width": ["interpolate", ["linear"], ["zoom"], 5,1, 8,1.5]
		}
	},
	海面:{
		layout: {
			"text-field": ["get", "轉換正名"],
			"text-font": ["literal", ["行楷-简","華康玉刻仿宋 W6","隶书","Noto Serif CJK KR","Noto Serif CJK"]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 4,15, 12,16, 14,20],
			"text-writing-mode": ["vertical"],
			"text-rotation-alignment": "map",// 隨圖轉
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "rgb(0, 10, 154)",
			"text-halo-color": "#fff",
			"text-halo-width": 0.5
		}
	},
	海底:{
		layout: {
			"text-field": ["get", "名"],
			"text-font": ["literal", ["AR KaiU30 MD","楷体","行楷-简","華康玉刻仿宋 W6","隶书","Noto Serif CJK KR","Noto Serif CJK"]],
			"text-size": ["interpolate", ["linear"], ["zoom"], 6,14, 13,20],
			"text-writing-mode": ["vertical"],
			"text-rotation-alignment": "map",// 隨圖轉
			"text-allow-overlap": false,
			"text-ignore-placement": false
		},
		paint: {
			"text-color": "#ffd",
			"text-halo-color": "hsl(156, 100%, 25%)",
			"text-halo-width": 0.5
		}
	}
};
const 諸層 = [{
	"id": "陸", "type": "background", "paint": {"background-color": "#F8F4F0"}
},{
	id: "底圖", type: "raster", source: "蹤迹", layout:{visibility: "none"}
},{
	"id": "學校", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landuse",
	"filter": ["match",["get", "class"],["university","school"], true, false],
	"paint": {"fill-color": "#ffe"}
},{
	"id": "里", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landuse",
	"filter": ["==",["get", "class"], "residential"],
	"paint": {
		"fill-color": "hsl(30,19%,90%)",
		"fill-opacity": 0.4,
		"fill-outline-color": "hsl(30,40%,80%)"
	}
},{
	"id": "醫院", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landuse",
	"filter": ["==",["get", "class"], "hospital"],
	"paint": {"fill-color": "#fef"}
},{
	"id": "公園一", "type": "fill",
	"source": "開放免費地圖", "source-layer": "park",
	"paint": {
		"fill-color": "#d8e8c8",
		"fill-opacity": 0.5,
		"fill-outline-color": "rgb(95, 208, 100)"
	}
},{
	"id": "公園二", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landcover",
	"filter":["==", ["get", "subclass"], "park"],
	"paint": {
		"fill-color": "#d8e8c8",
		"fill-opacity": 0.5,
		"fill-outline-color": "rgb(95, 208, 100)"
	}
},{
	"id": "運動場", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landuse",
	"filter": ["==",["get", "class"], "pitch"],
	"paint": {"fill-color": "#DEE3CD", "fill-opacity": 0.4}
},{
	id: "hills", type: "hillshade",
	source: "hillshadeSource",
	layout: {visibility: "visible"},
	paint: {"hillshade-shadow-color": "#473B2422"}
},{
	"id": "沙", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landcover",
	"filter": ["==",["get", "class"],"sand"],
	"paint": {
		"fill-color": "rgb(245, 238, 188)",
		"fill-opacity": 0.9
	}
},{
	"id": "水", "type": "fill",
	"source": "開放免費地圖", "source-layer": "water",
	"filter": ["all",
		["!=", ["get", "intermittent"], 1],
		["!=", ["get", "brunnel"], "tunnel"]
	],
	"paint": {"fill-color": "#AECFE2"}
},{
	"id": "草", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landcover",
	"filter": ["all",
		["==",["get", "class"],"grass"],
		["!=", ["get", "subclass"], "park"]
	],
	"paint": {
		"fill-color": "hsl(90, 41%, 80%)",
		"fill-opacity": 0.9
	}
},{
	"id": "林", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landcover",
	"filter": ["==",["get", "class"],"wood"],
	"paint": {
		"fill-color": "#21A675",
		"fill-opacity": 0.2,
		"fill-outline-color": "hsla(0,0%,0%,0.03)"
	}
},{
	"id": "海底地形", "type": "color-relief", "source": "海底高程", "maxzoom": 9,
	"paint": {'color-relief-color': [
			'interpolate',
			['linear'],
			['elevation'],
			-30000,'rgba(0,0,200,0)',
			-12000,'hsla(242, 100%, 20%, 0.6)',
			-3000,'hsla(222, 100%, 40%, 0.6)',
			-600,'hsla(215, 100%, 65%, 0.5)',
			-50,'hsla(210, 100%, 75%, 0.5)',
			-1,'hsla(208, 100%, 85%, 0.4)',
			0,'rgba(39, 144, 116, 0)',
			1,'rgba(244, 221, 4, 0)',
			8850,'rgba(215, 5, 13, 0)'
			// 400-3500, 'hsl(242, 100%, 21%)',
			// 582.35-3500, 'hsl(242, 99%, 30%)',
			// 764.71-3500, 'hsl(236, 90%, 39%)',
			// 947.06-3500, 'hsl(232, 86%, 46%)',
			// 1129.41-3500, 'hsl(228, 88%, 52%)',
			// 1311.76-3500, 'hsl(208, 81%, 42%)',
			// 1494.12-3500, 'hsl(164, 57%, 36%)',
			// 1676.47-3500, 'hsl(108, 71%, 39%)',
			// 1858.82-3500, 'hsl(85, 95%, 38%)',
			// 2041.18-3500, 'hsl(72, 96%, 40%)',
			// 2223.53-3500, 'hsl(63, 98%, 43%)',
			// 2405.88-3500, 'hsl(54, 97%, 49%)',
			// 2588.24-3500, 'hsl(46, 97%, 52%)',
			// 2770.59-3500, 'hsl(37, 98%, 54%)',
			// 2952.94-3500, 'hsl(28, 98%, 54%)',
			// 3135.29-3500, 'hsl(18, 99%, 53%)',
			// 3317.65-3500, 'hsl(6, 91%, 50%)',
			// 3500-3500, 'hsl(358, 96%, 43%)'
		]
	}
},{
	"id": "冰", "type": "fill",
	"source": "開放免費地圖", "source-layer": "landcover",
	"filter": ["==",["get", "class"], "ice"],
	"paint": {
		"fill-color": "rgb(245, 250, 255)",
		"fill-opacity": 0.6
	}
},{
	"id": "舟航綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["match",["get", "class"],["ferry"], true, false],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": "rgba(108, 159, 182, 1)",
		"line-dasharray": [2, 2],
		"line-width": ["interpolate",["linear"],["zoom"],
			4,0.5, 12,1
		]
	}
},{
	"id": "隧-鐵路-邑內", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["!",["has", "service"]],
		["==",["get", "brunnel"], "tunnel"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["邑軌"], "line-opacity": 0.5,
		"line-width": 3
	}
},{
	"id": "隧-鐵路-邑內虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["!",["has", "service"]],
		["==",["get", "brunnel"], "tunnel"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"], "line-opacity": 0.7,
		"line-dasharray": [3, 3],
		"line-width": 2
	}
},{
	"id": "隧-鐵路-長途", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["!",["has", "service"]],
		["==",["get", "brunnel"], "tunnel"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["長途軌"], "line-opacity": 0.5,
		"line-width": 路寬["軌外"]
	}
},{
	"id": "隧-鐵路-長途虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["!",["has", "service"]],
		["==",["get", "brunnel"], "tunnel"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"], "line-opacity": 0.7,
		"line-dasharray": [3, 3],
		"line-width": 路寬["軌內"]
	}
},{
	"id": "隧-巷緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==", ["get", "class"], "minor"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["巷緣"],
		"line-dasharray": [0.5, 0.25],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			12,0, 12.5,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,0.5, 13,1, 14,4, 20,15
		]
	}
},{
	"id": "隧-局域路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["match",["get", "class"],["service", "track"], true, false]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["局域路緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,1, 16,4, 20,11
		]
	}
},{
	"id": "隧-馳道之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,15
		]
	}
},{
	"id": "隧-大路之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,15
		]
	}
},{
	"id": "隧-三級路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "tertiary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			9,1.5, 20,16
		]
	}
},{
	"id": "隧-二級路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "secondary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			8,1.5, 20,17
		]
	}
},{
	"id": "隧-一級路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "primary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			7,0, 8,0.6, 9,1.5, 20,22
		]
	}
},{
	"id": "隧-幹路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "trunk"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["幹路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			5,0, 7,0.8
		],
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 6,0.6, 7,1.5, 20,22
		]
	}
},{
	"id": "隧-人行道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "tunnel"],
		["match",["get", "class"],["path", "pedestrian"], true, false]
	],
	"paint": {
		"line-color": 色["步道"],
		"line-dasharray": [1.5, 0.75],
		"line-width": 路寬["步"]
	}
},{
	"id": "隧-巷", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==", ["get", "class"], "minor"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["巷"],
		"line-width": 路寬["巷"]
	}
},{
	"id": "隧-局域路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["match",["get", "class"],["service", "track"], true, false]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["局域路"],
		"line-width": 路寬["局域"]
	}
},{
	"id": "隧-大路之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "隧-三級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "tertiary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["三級路"],
		"line-width": 路寬["三級"]
	}
},{
	"id": "隧-二級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "secondary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["二級路"],
		"line-width": 路寬["二級"]
	}
},{
	"id": "隧-一級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "primary"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["一級"]
	}
},{
	"id": "隧-幹路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "trunk"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["幹路"],
		"line-width": 路寬["幹"]
	}
},{
	"id": "隧-馳道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"], "line-opacity": 0.8,
		"line-dasharray": [0.5, 0.25],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 6,0.6, 7,1.5, 20,22
		]
	}
},{
	"id": "隧-馳道之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "隧-馳道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "tunnel"],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["馳"]
	}
},{
	"id": "人行區", "type": "fill",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 15,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], false, true],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["==", ["get", "class"], "path"]
	],
	"paint": {
		"fill-color": "hsl(30, 25%, 73%)",
		"fill-opacity": 0.3
	}
},{
	"id": "人行道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 15,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["path", "pedestrian"], true, false],
		["!=",["get", "subclass"], "steps"]
	],
	"paint": {
		"line-color": 色["步道"],
		"line-dasharray": [1.5, 0.75],
		"line-width": 路寬["步"]
	}
},{
	"id": "巷緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["service", "track"], true, false]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["巷緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,1, 16,4, 20,11
		]
	}
},{
	"id": "路-局域緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["minor"], true, false]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["局域路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			12,0, 12.5,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,0.5, 13,1, 14,4, 20,15
		]
	}
},{
	"id": "大路之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 13,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,15
		]
	}
},{
	"id": "路-三級緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"], "tertiary", true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			9,1.5, 20,16
		]
	}
},{
	"id": "路-二級緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"], "secondary", true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			8,0, 9,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			8,1.5, 20,17
		]
	}
},{
	"id": "路-一級緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["primary"], true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			7,0, 8,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			7,0, 8,0.6, 9,1.5, 20,22
		]
	}
},{
	"id": "幹路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["trunk"], true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["幹路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			5,0, 7,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0, 6,0.6, 7,1.5, 20,22
		]
	}
},{
	"id": "馳道之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["==", ["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,15
		]
	}
},{
	"id": "巷", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["service", "track"], true, false]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["巷"],
		"line-width": 路寬["巷"]
	}
},{
	"id": "路-局域", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["minor"], true, false]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["局域路"],
		"line-width": 路寬["局域"]
	}
},{
	"id": "大路之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 13,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "路-三級", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"], "tertiary", true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["三級路"],
		"line-width": 路寬["三級"]
	}
},{
	"id": "路-二級", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"], "secondary", true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["二級路"],
		"line-width": 路寬["二級"]
	}
},{
	"id": "路-一級", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["primary"], true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["一級"]
	}
},{
	"id": "幹路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["match",["get", "class"],["trunk"], true, false],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["幹路"],
		"line-width": 路寬["幹"]
	}
},{
	"id": "路-馳道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 4,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			4,0, 5,0.4, 6,0.6, 7,1.5, 20,22
		]
	}
},{
	"id": "馳道之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 12,
	"filter": ["all",
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["==", ["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "路-馳道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 4,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1]
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["馳"],
		"line-opacity": ["interpolate", ["linear"], ["zoom"], 4,0, 5,1]
	}
},{
	"id": "鐵路-邑內", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["!",["has", "service"]],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["邑軌"],
		"line-width": 3
	}
},{
	"id": "鐵路-邑內虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["!",["has", "service"]],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"],
		"line-dasharray": [3, 3],
		"line-width": 2
	}
},{
	"id": "鐵路-長途", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["!",["has", "service"]],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["長途軌"], "line-opacity": 0.9,
		"line-width": 路寬["軌外"]
	}
},{
	"id": "鐵路-長途虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["!",["has", "service"]],
		["match",["get", "brunnel"],["bridge", "tunnel"], false, true]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"],
		"line-dasharray": [3, 3],
		"line-width": 路寬["軌內"]
	}
},{
	"id": "橋階緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 15,
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "subclass"], "steps"]
	],
	"paint": {
		"line-color": "hsl(35, 6%, 50%)",
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,2, 20,14
		]
	}
},{
	"id": "階緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 15,
	"filter": ["==",["get", "subclass"], "steps"],
	"paint": {
		"line-color": "hsl(35, 6%, 90%)",
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,1.5, 20,12
		]
	}
},{
	"id": "階", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 15,
	"filter": ["==",["get", "subclass"], "steps"],
	"paint": {
		"line-color": 色["步道"],
		"line-dasharray": [1, 0.3],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,1, 20,8
		]
	}
},
"平面橋",
{
	"id": "陸國界无爭議者粗綫",
	"type": "line",
	"source": "開放免費地圖", "source-layer": "boundary",
	"filter": ["all",
		["==", ["get", "admin_level"], 2],
		["!=", ["get", "maritime"], 1],
		["!=", ["get", "disputed"], 1],
		["!", ["has", "claimed_by"]]
	],
	"layout": 共樣式["國界粗綫"]["layout"],
	"paint": 共樣式["國界粗綫"]["paint"]
},{
	"id": "陸國界无爭議者中心綫",
	"type": "line",
	"source": "開放免費地圖", "source-layer": "boundary",
	"filter": ["all",
		["==", ["get", "admin_level"], 2],
		["!=", ["get", "maritime"], 1],
		["!=", ["get", "disputed"], 1],
		["!", ["has", "claimed_by"]]
	],
	"layout": 共樣式["國界中心綫"]["layout"],
	"paint": 共樣式["國界中心綫"]["paint"]
},{
	"id": "天地圖爭議國界中心綫",
	"type": "line", "maxzoom":14,
	"source": "中國政區界綫", "source-layer": "中國國境綫未定",
	"layout": 共樣式["國界中心綫"]["layout"],
	"paint": 共樣式["國界中心綫"]["paint"]
},{
	"id": "陸國界天地圖粗綫",
	"type": "line", "maxzoom":7,
	"source": "中國政區界綫", "source-layer": "中國國境綫已定",
	"layout": 共樣式["國界粗綫"]["layout"],
	"paint": 共樣式["國界粗綫"]["paint"]
},{
	"id": "陸國界天地圖中心綫",
	"type": "line", "maxzoom":7,
	"source": "中國政區界綫", "source-layer": "中國國境綫已定",
	"layout": 共樣式["國界中心綫"]["layout"],
	"paint": 共樣式["國界中心綫"]["paint"]
},{
	"id": "陸省界无爭議者",
	"type": "line",
	"source": "開放免費地圖", "source-layer": "boundary",
	"minzoom": 5,
	"filter": ["all",
		[">=", ["get", "admin_level"], 3],
		["<=", ["get", "admin_level"], 4],
		["!=", ["get", "maritime"], 1],
		["!=", ["get", "disputed"], 1],
		["!", ["has", "claimed_by"]],
		["!=", ["get", "maritime"], 1],
		["!", ["within",{"type":"Polygon","coordinates":[臺灣外圍]}]]
	],
	"paint": 共樣式["中國省界"]["paint"]
},{
	"id": "陸省界天地圖",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "中國省界",
	"minzoom": 3,"maxzoom": 6.01,
	"paint": 共樣式["中國省界"]["paint"]
},{
	"id": "陸郡界无爭議者",
	"type": "line",
	"source": "開放免費地圖", "source-layer": "boundary",
	"minzoom": 7,
	"filter": ["all",
		["==", ["get", "admin_level"], 5],
		["!=", ["get", "disputed"], 1],
		["!", ["has", "claimed_by"]],
		["!=", ["get", "maritime"], 1]
	],
	"paint": 共樣式["郡界"]["paint"]
},{
	"id": "陸郡界天地圖",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "中國大陸郡界",
	"minzoom": 5,"maxzoom": 9,
	"paint": 共樣式["郡界"]["paint"]
},{
	"id": "陸郡界臺灣",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "臺灣郡界",
	"minzoom": 5,"maxzoom": 15,
	"paint": 共樣式["郡界"]["paint"]
},{
	"id": "陸縣界无爭議者",
	"type": "line",
	"source": "開放免費地圖", "source-layer": "boundary",
	"minzoom": 8,
	"filter": ["all",
		["==", ["get", "admin_level"], 6],
		["!=", ["get", "disputed"], 1],
		["!", ["has", "claimed_by"]],
		["!=", ["get", "maritime"], 1]
	],
	"paint": 共樣式["縣界"]["paint"]
},{
	"id": "陸縣界臺灣",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "臺灣縣界",
	"minzoom": 8,"maxzoom": 17,
	"paint": 共樣式["縣界"]["paint"]
},{
	"id": "中國海疆粗綫",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "中國海疆綫",
	"minzoom": 2,
	"paint": {
		"line-color": "hsla(270,70%,66%,0.5)",
		"line-opacity": ["interpolate",["linear"],["zoom"],
			1,0, 4,1
		],
		"line-width": ["interpolate",["linear"],["zoom"],
			3,4, 12,7
		]
	}
},{
	"id": "中國海疆中心綫",
	"type": "line",
	"source": "中國政區界綫", "source-layer": "中國海疆綫",
	"minzoom": 2,
	"paint": {
		"line-color": "#c19",
		"line-width": ["interpolate",["linear"],["zoom"],
			3,1, 12,3
		]
	}
},{
	id:"經綫", type:"line", source:"經綫",
	paint: {
		"line-color": "#1990e5",
		"line-width": 0.5
	}
},{
	id:"普通緯綫", type:"line", source:"普通緯綫",
	paint: {
		"line-color": "#1990e5",
		"line-width": 0.5
	}
},{
	id:"赤道", type:"line", source:"特殊緯綫",
	filter: ["==", ["get", "name"], "赤道"],
	paint: {
		"line-color": "#F0C9C9",
		"line-width": 1
	}
},{
	id:"回歸綫和極圈", type:"line", source:"特殊緯綫",
	filter: ["!=", ["get", "name"], "赤道"],
	paint: {
		"line-color": ["match", ["get", "name"], "北回歸綫", "#DFDFB0", "南回歸綫", "#DFDFB0", "北極圈", "#BFBFB0", "南極圈", "#BFBFB0", "#888"],
		"line-width": 0.8,
		"line-dasharray": [7,3]
	}
},{
	"id": "3d-buildings",
	"source": "開放免費地圖",
	"source-layer": "building",
	"type": "fill-extrusion",
	"minzoom": 15,
	"filter": ["!=", ["get", "hide_3d"], true],
	"paint": {
		"fill-extrusion-color": ["interpolate", ["linear"],["get", "render_height"],
			0, "lightgray", 1, ["coalesce", ["get", "colour"],"#e0e0e0"]
		],
		"fill-extrusion-height": ["interpolate",["linear"],["zoom"],
			15, 0, 16, ["coalesce",["get", "render_height"],["*", ["coalesce", ["get", "building:levels"], 3], 3]]
		],
		"fill-extrusion-base": ["case",
			[">=", ["get", "zoom"], 16],
			["coalesce", ["get", "base_height"], ["get", "render_min_height"], 0],
			0
		],
		"fill-extrusion-opacity": 0.9
	}
},{
	"id": "馳道名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "transportation_name",
	"minzoom": 7,
	"filter": ["==",["get", "class"], "motorway"],
	"layout": {
		"symbol-placement": "line",
		"text-field": 語文候補列,
		"text-font": 黑體,
		"text-rotation-alignment": "map",
		"text-size": ["interpolate",["linear"],["zoom"],
			9,10, 16,16
		]
	},
	"paint": {
		"text-color": "#444", "text-halo-color": "#fff",
		"text-halo-blur": 0.5,
		"text-halo-width": 1
	}
},{
	"id": "大路名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "transportation_name",
	"minzoom": 10,
	"filter": ["match",["get", "class"],["primary","trunk"], true, false],
	"layout": {
		"symbol-placement": "line",
		"text-field": 語文候補列,
		"text-font": 黑體,
		"text-rotation-alignment": "map",
		"text-size": ["interpolate",["linear"],["zoom"],
			13,12, 17,16
		]
	},
	"paint": {
		"text-color": "#666", "text-halo-color": "#fff",
		"text-halo-blur": 0.5,
		"text-halo-width": 1
	}
},{
	"id": "二、三級路名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "transportation_name",
	"minzoom": 12,
	"filter": ["match",["get", "class"],["secondary","tertiary"], true, false],
	"layout": {
		"symbol-placement": "line",
		"text-field": 語文候補列,
		"text-font": 黑體,
		"text-rotation-alignment": "map",
		"text-size": ["interpolate",["linear"],["zoom"],
			13,12, 17,16
		]
	},
	"paint": {
		"text-color": "#666", "text-halo-color": "#fff",
		"text-halo-blur": 0.5,
		"text-halo-width": 1
	}
},{
	"id": "小路名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "transportation_name",
	"minzoom": 15,
	"filter": ["match",["get", "class"],["minor", "service", "track"], true, false],
	"layout": {
		"symbol-placement": "line",
		"text-field": 語文候補列,
		"text-font": 黑體,
		"text-rotation-alignment": "map",
		"text-size": ["interpolate",["linear"],["zoom"],
			15,13, 18,16
		]
	},
	"paint": {
		"text-color": "#666", "text-halo-color": "#fff",
		"text-halo-blur": 0.4,
		"text-halo-width": 1
	}
},{
	"id": "川名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "waterway",
	"minzoom": 8,
	"filter": ["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
	"layout": {
		"symbol-placement": "line",
		"symbol-spacing": 350,
		"text-field": 語文候補列,
		"text-font": ["literal", ["Times","行楷-简","AR KaiU30 MD","楷体","標楷體","南監體","統刊朙","Noto Serif CJK KR"]],
		"text-letter-spacing": 0.2,
		"text-max-width": 5,
		"text-size": ["interpolate", ["linear"], ["zoom"], 8,12, 10,16]
	},
	"paint": {
		"text-color": "#74aee9",
		"text-halo-color": "rgba(255,255,255,0.7)",
		"text-halo-width": 1.5
	}
},{
	"id": "水名-點狀", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "water_name",
	"filter": ["match",["geometry-type"],["MultiPoint", "Point"], true, false],
	"layout": {
		"text-field": 語文候補列,
		"text-font": ["literal", ["Times","行楷-简","AR KaiU30 MD","楷体","標楷體","南監體","統刊朙","Noto Serif CJK KR"]],
		"text-letter-spacing": 0.2,
		"text-max-width": 9,
		"text-size": ["interpolate",["linear"],["zoom"],
			6,10, 8,14
		],
		"text-writing-mode": ["vertical"],
		"text-rotation-alignment": "map",// 隨圖轉
	},
	"paint": {
		"text-color": "#495e91",
		"text-halo-color": "rgba(255,255,255,0.7)",
		"text-halo-width": 1.5
	}
},{
	"id": "水名-綫狀", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "water_name",
	"filter": ["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
	"layout": {
		"symbol-placement": "line",
		"symbol-spacing": 350,
		"text-field": 語文候補列,
		"text-font": ["Times","行楷-简","AR KaiU30 MD","楷体","標楷體","南監體","統刊朙","Noto Serif CJK KR"],
		"text-letter-spacing": 0.2,
		"text-max-width": 9,
		"text-size": ["interpolate",["linear"],["zoom"],
			6,12, 9,16
		]
	},
	"paint": {
		"text-color": "#495e91",
		"text-halo-color": "rgba(255,255,255,0.7)",
		"text-halo-width": 1.5
	}
},{
	id: "點-大陸鄉名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "大陸之鄉",
	layout: 共樣式["鄉點"]["layout"],
	paint: 共樣式["鄉點"]["paint"]
},{
	id: "點-臺灣鄉名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "臺灣之鄉",
	layout: 共樣式["鄉點"]["layout"],
	paint: 共樣式["鄉點"]["paint"]
},{
	id: "點-外國鄉名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "外國之鄉",
	layout: 共樣式["鄉點"]["layout"],
	paint: 共樣式["鄉點"]["paint"]
},{
	id: "點-中國附郭區名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "中國之附郭區",
	layout: 共樣式["縣點"]["layout"],
	paint: 共樣式["縣點"]["paint"]
},{
	id: "點-中國郊縣名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "中國之普通縣",
	layout: 共樣式["縣點"]["layout"],
	paint: 共樣式["縣點"]["paint"]
},{
	id: "點-外國縣名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "外國之普通縣",
	layout: 共樣式["縣點"]["layout"],
	paint: 共樣式["縣點"]["paint"]
},{
	id: "點-中國省轄縣名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "中國之省轄縣",
	layout: {
		"text-field": ["step", ["zoom"], ["get", "實專名"], 8, ["concat",["get", "實專名"],["get", "通名"]]],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 10, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 5,12, 16,31],
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: 共樣式["省轄縣點"]["paint"]
},{
	id: "點-外國直轄縣名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "外國之直轄縣",
	layout: {
		"text-field": ["step", ["zoom"], ["get", "實專名"], 8, ["concat",["get", "實專名"],["get", "通名"]]],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 10, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 5,13, 16,32],
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: {
		"text-color": "#000",
		"text-halo-color": "#fff",
		"text-opacity": ["interpolate", ["linear"], ["zoom"], 5,0.5, 7,1],
		"text-halo-width": 2
	}
},{
	id: "點-中國郡名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "中國之郡",
	layout: {
		"text-field": ["step", ["zoom"], ["get", "簡稱"], 5, ["get", "實專名"], 7, ["concat",["get", "實專名"],["case",["any", ["==", ["get", "通名"], ""],["==", ["get", "通名"], "府"],["==", ["get", "通名"], "都"],["==", ["get", "通名"], "畿"]],"市",["==", ["get", "通名"], "地"],"地區",["==", ["get", "通名"], "邦"],"特區",["get", "通名"]]]],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 8, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,30],
		"text-max-width":9,
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: 共樣式["郡點"]["paint"]
},{
	id: "點-普通國郡名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "普通國之郡",
	layout: {
		"text-field": ["step", ["zoom"], ["get", "實專名"], 7, ["concat",["get", "實專名"],["get", "通名"]]],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 8, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,30],
		"text-max-width":9,
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: 共樣式["郡點"]["paint"]
},{
	id: "點-大國郡名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "大國之郡",
	layout: {
		"text-field": ["step", ["zoom"], ["get", "實專名"], 7, ["concat",["get", "實專名"],["get", "通名"]]],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 8, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,30],
		"text-max-width":9,
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: 共樣式["郡點"]["paint"]
},{
	id: "點-小國名",
	type: "symbol",
	source: "鄉以上地點",
	"source-layer": "小國",
	layout: 共樣式["國點"]["layout"],
	paint: 共樣式["國點"]["paint"]
},{
	id:"點標", type:"symbol", source:"開放免費地圖", "source-layer": "poi", "minzoom": 12,
	filter: ["all",
		["has", "name"],
		["!", ["has", "building:part"]] 
	],
	layout:{
		"text-field": 語文候補列,
		"text-font": 黑體,
		"text-size": ["interpolate", ["linear"], ["zoom"], 15,10, 18,14],
		"text-writing-mode": ["vertical"], "text-justify": "center",
		"text-anchor": "center",
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	paint: {
		"text-color": "#2c3e50",
		"text-halo-color": "#ffffff",
		"text-halo-width": 1.2
	}
},{
	"id":"中國大陸之岬角", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "岬角",
	"layout": {
		"text-field": ["get", "轉換正名"],
		"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 8,14, 14,16],
		"text-writing-mode": ["vertical"],
		"text-rotation-alignment": "map",// 隨圖轉
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	"paint": {
		"text-color": "rgba(32,32,32,0.7)",
		"text-halo-color": "rgba(240,240,240,0.5)",
		"text-halo-width": ["interpolate", ["linear"], ["zoom"], 8,0.5, 14,1.5]
	}
},{
	"id":"中國大陸之灘", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "灘",
	"layout": {
		"text-field": ["get", "轉換正名"],
		"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 8,14, 14,16],
		"text-writing-mode": ["vertical"],
		"text-rotation-alignment": "map",// 隨圖轉
		"text-allow-overlap": false,
		"text-ignore-placement": false
},
	"paint": {
		"text-color": "rgba(32,32,32,0.9)",
		"text-halo-color": "rgba(240,240,240,0.5)",
		"text-halo-width": ["interpolate", ["linear"], ["zoom"], 8,0.5, 14,1.5]
	}
},{
	"id":"中國大陸之河口", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "河口",
	"layout": 共樣式["海面"]["layout"],
	"paint": 共樣式["海面"]["paint"],
},{
	"id":"中國大陸之水道", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "水道",
	"layout": 共樣式["海面"]["layout"],
	"paint": 共樣式["海面"]["paint"],
},{
	"id":"中國大陸之海島", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "海島",
	"layout": 共樣式["島礁"]["layout"],
	"paint": 共樣式["群島"]["paint"],
},{
	"id":"南海面實體", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "南海實體點",
	"layout": 共樣式["島礁"]["layout"],
	"paint": 共樣式["群島"]["paint"],
},{
	"id":"公海底", "type":"symbol",
	"source":"公海和南極", "source-layer": "公海底",
	"layout": 共樣式["海底"]["layout"],
	"paint": 共樣式["海底"]["paint"],
},{
	"id":"南海底", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "南海底",
	"layout": 共樣式["海底"]["layout"],
	"paint": 共樣式["海底"]["paint"],
},{
	"id":"南海頂級群島", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "南海四大群島",
	"layout": {
		"text-field": ["step", ["zoom"], ["get", "標準專名"], 5, ["concat",["get", "標準專名"],["get", "類別"]]],
		"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 4,14, 14,20],
		"text-writing-mode": ["vertical"],
		"text-rotation-alignment": "map",// 隨圖轉
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	"paint": 共樣式["群島"]["paint"],
},{
	"id":"南海次級群島礁", "type":"symbol",
	"source":"中國除港澳臺外之海域", "source-layer": "南海次級群島礁",
	"layout": {
		"text-field": ["step", ["zoom"], ["get", "標準專名"], 6, ["concat",["get", "標準專名"],["get", "類別"]]],
		"text-font": ["step", ["zoom"], ["literal", 膚廓體], 8, ["literal", ["華康玉刻仿宋 W6","隶书"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 5,12, 15,20],
		"text-writing-mode": ["vertical","horizontal"],
		"text-rotation-alignment": "map",// 隨圖轉
		"text-allow-overlap": false,
		"text-ignore-placement": false,
		"symbol-avoid-edges": true
	},
	"paint": 共樣式["群島"]["paint"],
},{
	"id":"南極自然地點", "type":"symbol",
	"source":"公海和南極", "source-layer": "南極自然地點",
	"layout": {
		"text-field": ["get", "中文名"],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 10, ["literal", ["AR KaiU30 MD","楷体","Open Sans Regular","Arial Unicode MS Regular"]]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 3,12, 15,20],
		"text-writing-mode": ["vertical"],
		"text-rotation-alignment": "map",// 隨圖轉
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	"paint": {
		"text-color": "#fff",
		"text-halo-color": "hsl(186, 89%, 27%)",
		"text-halo-width": ["interpolate", ["linear"], ["zoom"], 3,1, 15,2]
	}
},{
	"id":"南極科攷站點", "type":"symbol",
	"source":"公海和南極", "source-layer": "南極科攷站",
	"layout": {
		"text-field": ["concat", ["get", "名"], "站"],
		"text-font": ["step", ["zoom"], ["literal", 黑體], 10, ["literal", 膚廓體]],
		"text-size": ["interpolate", ["linear"], ["zoom"], 3,12, 15,20],
		"text-writing-mode": ["vertical"],
		"text-allow-overlap": false,
		"text-ignore-placement": false
	},
	"paint": {
		"text-color": "#fff",
		"text-halo-color": "#000",
		"text-halo-width": ["interpolate", ["linear"], ["zoom"], 3,1, 15,2]
	}
},
"中國大陸之半島","中國大陸之海域","中國大陸之海灣","中國大陸之海峽","中國大陸之群島",
{
	"id": "飛機場名", "type": "symbol",
	"source": "開放免費地圖", "source-layer": "aerodrome_label",
	"minzoom": 11,
	"filter": ["has", "iata"],
	"layout": {
		"text-field": 語文候補列,
		"text-font": ["step", ["zoom"], ["literal", 黑體], 12, ["literal", 隸書]],
		"text-max-width": 9,
		"text-offset": [0, 0.6], "text-optional": true, "text-padding": 2,
		"text-size": ["interpolate",["linear"],["zoom"], 10,12, 16,14],
		"text-writing-mode": ["vertical","horizontal"],
	},
	"paint": {
		"text-color": "#444",
		"text-halo-blur": 0.5,
		"text-halo-color": "#fff",
		"text-halo-width": 1
	}
}
];
function 填層(){
	const 平面橋始序 = 諸層.indexOf("平面橋");
	let 橋層, 濾層條件 = [">=", ["to-number", ["get", "layer"]], 6];
	for (let l=6; l>0; l--){
		if (l>1 && l<6){
			濾層條件 = ["==", ["get", "layer"], l];
		} else if (l==1){
			濾層條件 = ["<", ["to-number", ["get", "layer"]], 2];
		}
		橋層 = [{
	"id": "橋"+String(l)+"馳道之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,19
		]
	}
},{
	"id": "橋"+String(l)+"大路之匝道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,1, 13,3, 14,4, 20,19
		]
	}
},{
	"id": "橋"+String(l)+"二、三級路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["secondary", "tertiary"], true, false],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-opacity": 1,
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 7,0.6, 8,1.5, 20,21
		]
	}
},{
	"id": "橋"+String(l)+"一級路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "primary"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一二三級路緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 6,0.6, 7,1.5, 20,26
		]
	}
},{
	"id": "橋"+String(l)+"幹路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "trunk"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["幹路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			5,0, 7,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 6,0.6, 7,1.5, 20,26
		]
	}
},{
	"id": "橋"+String(l)+"小路緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["minor", "service", "track"], true, false],
		濾層條件
	],
	"layout": {"line-cap": "butt", "line-join": "round"},
	"paint": {
		"line-color": 色["局域路緣"],
		"line-opacity": ["interpolate",["linear"],["zoom"],
			12,0, 12.5,1
		],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			12,0.5, 13,1, 14,6, 20,24
		]
	}
},{
	"id": "橋"+String(l)+"人行緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["path", "pedestrian"], true, false],
		濾層條件
	],
	"paint": {
		"line-color": "#f8f4f0", "line-opacity": 0.8,
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			15,1.2, 20,12
		]
	}
},{
	"id": "橋"+String(l)+"人行", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["path", "pedestrian"], true, false],
		濾層條件
	],
	"paint": {
		"line-color": 色["步道"],
		"line-dasharray": [1.5, 0.75],
		"line-width": 路寬["步"]
	}
},{
	"id": "橋"+String(l)+"大路之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["primary","secondary","tertiary","trunk"], true, false],
		["==", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "橋"+String(l)+"巷", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "minor"],
		濾層條件
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["巷"],
		"line-width": 路寬["巷"]
	}
},{
	"id": "橋"+String(l)+"局域路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "brunnel"], "bridge"],
		["match",["get", "class"],["service", "track"], true, false],
		濾層條件
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["局域路"],
		"line-width": 路寬["局域"]
	}
},{
	"id": "橋"+String(l)+"三級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "tertiary"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["三級路"],
		"line-width": 路寬["三級"]
	}
},{
	"id": "橋"+String(l)+"二級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "secondary"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["二級路"],
		"line-width": 路寬["二級"]
	}
},{
	"id": "橋"+String(l)+"一級路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "primary"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["一級路"],
		"line-width": 路寬["一級"]
	}
},{
	"id": "橋"+String(l)+"幹路", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "trunk"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-cap": "round", "line-join": "round"},
	"paint": {
		"line-color": 色["幹路"],
		"line-width": 路寬["幹"]
	}
},{
	"id": "橋"+String(l)+"馳道緣", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道緣"],
		"line-width": ["interpolate",["exponential", 1.2],["zoom"],
			5,0.4, 6,0.6, 7,1.5, 20,26
		]
	}
},{
	"id": "橋"+String(l)+"馳道之匝道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "motorway"],
		["==", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["聮"]
	}
},{
	"id": "橋"+String(l)+"馳道", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"filter": ["all",
		["==",["get", "brunnel"], "bridge"],
		["==",["get", "class"], "motorway"],
		["!=", ["get", "ramp"], 1],
		濾層條件
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["馳道"],
		"line-width": 路寬["馳"]
	}
},{
	"id": "橋"+String(l)+"鐵路緣-邑內", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["==",["get", "brunnel"], "bridge"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": "hsl(35, 6%, 50%)",
		"line-width": 5
	}
},{
	"id": "橋"+String(l)+"鐵路-邑內", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["==",["get", "brunnel"], "bridge"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["邑軌"],
		"line-width": 3
	}
},{
	"id": "橋"+String(l)+"鐵路-邑內虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 10,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==",["get", "class"], "transit"],
		["==",["get", "brunnel"], "bridge"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"],
		"line-dasharray": [3, 3],
		"line-width": 2
	}
},{
	"id": "橋"+String(l)+"鐵路-長途", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["==",["get", "brunnel"], "bridge"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["長途軌"],
		"line-width": ["interpolate",["exponential", 1.3],["zoom"],
			12,5, 20,9
		]
	}
},{
	"id": "橋"+String(l)+"鐵路-長途虛綫", "type": "line",
	"source": "開放免費地圖", "source-layer": "transportation",
	"minzoom": 5,
	"filter": ["all",
		["match",["geometry-type"],["LineString", "MultiLineString"], true, false],
		["==", ["get", "class"], "rail"],
		["==",["get", "brunnel"], "bridge"]
	],
	"layout": {"line-join": "round"},
	"paint": {
		"line-color": 色["軌間"],
		"line-dasharray": [3, 3],
		"line-width": 路寬["軌內"]
	}
}];
		for(let b=橋層.length-1; b>=0; b--){
			諸層.splice(平面橋始序+1, 0, 橋層[b]);
		}
	}
	諸層.splice(平面橋始序, 1);
	const 半島始序 = 諸層.indexOf("中國大陸之半島");
	for (let z=5; z<=14; z++){
		const 該層 = {"id":"中國大陸之半島"+String(z), "type":"symbol",
			"source":"中國除港澳臺外之海域", "source-layer": "半島z"+String(z),
			"layout": 共樣式["半島"]["layout"],
			"paint": 共樣式["半島"]["paint"],
			"maxzoom": z+2
		};
		諸層.splice(半島始序+1, 0, 該層);
	}
	諸層.splice(半島始序, 1);
	const 海域始序 = 諸層.indexOf("中國大陸之海域");
	for (let z=3; z<=12; z++){
		const 該層 = {"id":"中國大陸之海域"+String(z), "type":"symbol",
			"source":"中國除港澳臺外之海域", "source-layer": "海域z"+String(z),
			"layout": 共樣式["海面"]["layout"],
			"paint": 共樣式["海面"]["paint"],
			"maxzoom": z+5
		};
		諸層.splice(海域始序+1, 0, 該層);
	}
	諸層.splice(海域始序, 1);
	const 海灣始序 = 諸層.indexOf("中國大陸之海灣");
	for (let z=5; z<=10; z++){
		const 該層 = {"id":"中國大陸之海灣"+String(z), "type":"symbol",
			"source":"中國除港澳臺外之海域", "source-layer": "海灣z"+String(z),
			"layout": 共樣式["海面"]["layout"],
			"paint": 共樣式["海面"]["paint"],
			"maxzoom": z+5
		};
		諸層.splice(海灣始序+1, 0, 該層);
	}
	諸層.splice(海灣始序, 1);
	const 海峽始序 = 諸層.indexOf("中國大陸之海峽");
	for (let z of [5,6,8,10]){
		const 該層 = {"id":"中國大陸之海峽"+String(z), "type":"symbol",
			"source":"中國除港澳臺外之海域", "source-layer": "海峽z"+String(z),
			"layout": 共樣式["海面"]["layout"],
			"paint": 共樣式["海面"]["paint"],
			"maxzoom": z+5
		};
		諸層.splice(海峽始序+1, 0, 該層);
	}
	諸層.splice(海峽始序, 1);
	const 群島始序 = 諸層.indexOf("中國大陸之群島");
	for (let z=6; z<=14; z++){
		const 該層 = {"id":"中國大陸之群島"+String(z), "type":"symbol",
			"source":"中國除港澳臺外之海域", "source-layer": "群島列島z"+String(z),
			"layout": 共樣式["群島"]["layout"],
			"paint": 共樣式["群島"]["paint"],
			"maxzoom": z+6
		};
		諸層.splice(群島始序+1, 0, 該層);
	}
	諸層.splice(群島始序, 1);
}
填層();