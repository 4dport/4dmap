import Protobuf from 'https://unpkg.com/pbf@4.0.1/index.js';
import {VectorTile} from 'https://esm.run/@mapbox/vector-tile@2.0.3/index.js';
import tileToProtobuf from 'https://esm.run/vt-pbf@3.1.3/index.js';
import { 基礎字對 } from './Characters.js';
import { 基礎字對倭 } from './CharactersJP.js';
import { 逕轉一對多字對,微調字對 } from './Finetunes.js'
const 濾類 = [
	["发",["beauty","hairdresser_supply","hairdresser"],"髮","發"],
	["面",["restaurant","food_court","bakery","fast_food"],"麵","面"],
	["谷",["restaurant","food_court","bakery","fast_food"],"穀","谷"]
];
function 括號轉全形(str){
	return str.replace(/\s*\(\s*/g,'（').replace(/\s*\)\s*/g,'）');
}
function 一對一轉字(str){
	var 轉得 = str.split('');// 未慮擴展平面
	for (const 字對 of [基礎字對,基礎字對倭,微調字對,逕轉一對多字對]){
		let 字映射 = new Map(字對);
		轉得 = 轉得.map(c => 字映射.get(c) || c);
	}
	轉得 = 括號轉全形(轉得.join(''));
	return 轉得;
}
function 微調(str){
	const 字映射 = new Map(微調字對);
	return 括號轉全形(str.split('').map(c => 字映射.get(c) || c).join(''));
}
function 轉地名(徵){
	const 屬性彙 = 徵.properties;
	// 據坐標轉詞
	// 徵.geometry["coordinates"]…
	// 據性質轉字
	if (typeof 屬性彙["name:zh-Hant"] !=='string' && typeof 屬性彙["class"] !=='undefined')
		for (const [簡化字, 屬類集, 是則, 否則] of 濾類){
			for (const 名文 of ["name:zh","name"]){//jp
				if (typeof 屬性彙[名文] ==='string'){
					if (屬性彙[名文].includes(簡化字)){
						if (屬類集.includes(屬性彙["class"])){
							屬性彙[名文] = 屬性彙[名文].replace(簡化字, 是則);
						} else {
							屬性彙[名文] = 屬性彙[名文].replace(簡化字, 否則);
						}
					}
					break;
				}
			}
		}
	// 末了一對一機械轉字
	if (typeof 屬性彙["name:zh-Hant"] ==='string')
		屬性彙["name:zh-Hant"] = 微調(屬性彙["name:zh-Hant"]);
	else if (typeof 屬性彙["name:zh"] ==='string')
		屬性彙["name:zh"] = 一對一轉字(屬性彙["name:zh"]);
	else if (typeof 屬性彙["name"] ==='string')
		屬性彙["name"] = 一對一轉字(屬性彙["name"]);
}
export async function 轉瓦內字(url){
	return fetch(url).then((response) => response.arrayBuffer()).then((data) => new VectorTile(new Protobuf(data))).then((tile) => ({
		layers: Object.entries(tile.layers).reduce((acc, [layerId, layer]) => ({...acc,
			[layerId]: {...layer,
				feature: (index) => {
					const feature = layer.feature(index);
					if (feature.properties) {
						轉地名(feature);//, feature.geometry
					}
					return feature;
				}
			}
		}), {})
	})).then((tile) => tileToProtobuf(tile).buffer).then((data) => ({ data }));
}