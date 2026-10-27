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