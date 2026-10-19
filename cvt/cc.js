import Protobuf from 'https://unpkg.com/pbf@4.0.1/index.js';
import {VectorTile} from 'https://esm.run/@mapbox/vector-tile@2.0.3/index.js';
import tileToProtobuf from 'https://esm.run/vt-pbf@3.1.3/index.js';
import { 基礎字對 } from './Characters.js';
import { 基礎字對倭 } from './CharactersJP.js';
import { 逕轉一對多字對,微調字對 } from './Finetunes.js'
function 轉簡為正(str){
	// 應先轉詞。此只轉字係暫時方案
	var 轉得 = str.split('');
	for (const 字對 of [基礎字對,基礎字對倭,微調字對,逕轉一對多字對]){
		let 字映射 = new Map(字對);
		轉得 = 轉得.map(c => 字映射.get(c) || c);
	}
	轉得 = 轉得.join('');
	return 轉得;
}
export async function 轉瓦內字(url){
	return fetch(url).then((response) => response.arrayBuffer()).then((data) => new VectorTile(new Protobuf(data))).then((tile) => ({
		layers: Object.entries(tile.layers).reduce((acc, [layerId, layer]) => ({...acc,
			[layerId]: {...layer,
				feature: (index) => {
					const feature = layer.feature(index);
					if (feature.properties) {
						if (typeof feature.properties["name"] ==='string')
							feature.properties["name"] = 轉簡為正(feature.properties["name"]);
						if (typeof feature.properties["name:zh"] ==='string')
							feature.properties["name:zh"] = 轉簡為正(feature.properties["name:zh"]);
					}
					return feature;
				}
			}
		}), {})
	})).then((tile) => tileToProtobuf(tile).buffer).then((data) => ({ data }));
}
