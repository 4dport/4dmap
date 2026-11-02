
/**
 * MapLibre GL JS ≥ 6.x
 * 晝夜及民用、天文、航海晨昏蒙影。
 * Day/night terminator with civil, nautical and astronomical twilight.
 * 支持地球儀投影。
 * Projection-aware: globe.
 * Uses MapLibre's injected projection shader helpers.
 */
export class TerminatorLayer {
	constructor({
		id = "terminator",
		updateInterval = 60000,
		nightOpacity = 0.50,
		astronomicalOpacity = 0.50,
		nauticalOpacity = 0.45,
		civilOpacity = 0.35,
		columns = 256, rows = 128
	} = {}) {
		this.id = id;
		this.type = "custom";
		this.renderingMode = "2d";
		this.updateInterval = updateInterval;
		this.opacities = [nightOpacity, astronomicalOpacity, nauticalOpacity, civilOpacity];
		this.columns = columns;
		this.rows = rows;

		this.map = null;
		this.gl = null;
		this.timer = null;

		this.programs = new Map();
		this.buffer = null;
		this.vertexCount = 0;

		this.sun = getSubsolarPoint(new Date());
	}
	onAdd(map, gl) {
		this.map = map;
		this.gl = gl;
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			this.createWorldMesh(),
			gl.STATIC_DRAW
		);
		this.updateSun();
		this.timer = setInterval(() => {
			this.updateSun();
			this.map?.triggerRepaint();
		}, this.updateInterval);
	}
	createWorldMesh() {
		const vertices = [];
		const nx = this.columns;
		const ny = this.rows;
		for (let j = 0; j < ny; j++) {
			const y0 = j / ny;
			const y1 = (j + 1) / ny;
			for (let i = 0; i < nx; i++) {
				const x0 = i / nx;
				const x1 = (i + 1) / nx;
				// Two triangles per cell.
				vertices.push(
					x0, y0, x1, y0, x0, y1,
					x0, y1, x1, y0, x1, y1
				);
			}
		}
		this.vertexCount = vertices.length / 2;
		return new Float32Array(vertices);
	}
	updateSun(date = new Date()) {
		this.sun = getSubsolarPoint(date);
	}
	/**
	 * Cache one WebGL program per MapLibre projection shader variant.
	 */
	getProgram(gl, shaderData) {
		const key = shaderData.variantName;
		if (this.programs.has(key)) {
			return this.programs.get(key);
		}
		const vertexSource = `#version 300 es
${shaderData.vertexShaderPrelude}
${shaderData.define}

in vec2 a_pos;
out vec2 v_mercator;

void main() {
	v_mercator = a_pos;

	// a_pos is in normalized world Mercator coordinates [0,1].
	// MapLibre's injected code handles globe and Mercator projection.
	gl_Position = projectTile(a_pos);
}
`;

		const fragmentSource = `#version 300 es
precision highp float;

in vec2 v_mercator;
out vec4 fragColor;

uniform vec2 u_sunLonLat;
uniform vec4 u_opacities;

const float PI = 3.141592653589793;

float degToRad(float d) {
	return d * PI / 180.0;
}
float radToDeg(float r) {
	return r * 180.0 / PI;
}
float harmonicSlope(float a, float b) {
	if (a <= 0.0 || b <= 0.0) { return 0.0;}
	return 2.0 * a * b / (a + b);
}
float hermite(float y0, float y1, float m0, float m1, float t) {
	float t2 = t * t;
	float t3 = t2 * t;
	return (2.0 * t3 - 3.0 * t2 + 1.0) * y0
		+ (t3 - 2.0 * t2 + t) * 6.0 * m0
		+ (-2.0 * t3 + 3.0 * t2) * y1
		+ (t3 - t2) * 6.0 * m1;
}
float twilightAlpha(float altitude) {
	float x = clamp(-altitude, 0.0, 18.0);
	float y0 = 0.0;
	float y1 = u_opacities.w; // Civil twilight:  -6°
	float y2 = u_opacities.z; // Nautical twilight: -12°
	float y3 = u_opacities.y; // Astronomical twilight: -18°
	// float y4 = u_opacities.x; // Night: -24°
	float d0 = (y1 - y0) / 6.0;
	float d1 = (y2 - y1) / 6.0;
	float d2 = (y3 - y2) / 6.0;
	// float d3 = (y4 - y3) / 6.0;
	float m0 = d0;
	float m1 = harmonicSlope(d0, d1);
	float m2 = harmonicSlope(d1, d2);
	float m3 = d2;
	// float m4 = d3;
	if (altitude >= 0.0) return 0.0;
	if (x >= 18.0) return y3;
	float segment = floor(x / 6.0);
	float t = (x - segment * 6.0) / 6.0;
	if (segment < 1.0)
		return hermite(y0, y1, m0, m1, t);
	if (segment < 2.0)
		return hermite(y1, y2, m1, m2, t);
	// if (segment < 3.0)
	return hermite(y2, y3, m2, m3, t);
	// return hermite(y3, y4, m3, m4, t);
}

void main() {
	// Recover longitude and latitude from normalized Mercator coordinates.
	float lon = (v_mercator.x * 360.0 - 180.0);
	float mercY = v_mercator.y;

	float lat = radToDeg(
		atan(sinh(PI * (1.0 - 2.0 * mercY)))
	);

	float sunLon = degToRad(u_sunLonLat.x);
	float sunLat = degToRad(u_sunLonLat.y);

	float longitude = degToRad(lon);
	float latitude = degToRad(lat);

	vec3 surface = vec3(
		cos(latitude) * cos(longitude),
		cos(latitude) * sin(longitude),
		sin(latitude)
	);
	vec3 sunDirection = vec3(
		cos(sunLat) * cos(sunLon),
		cos(sunLat) * sin(sunLon),
		sin(sunLat)
	);
	// Dot product = sin(solar altitude).
	float sinAltitude = clamp(
		dot(surface, sunDirection),
		-1.0,
		1.0
	);

	float altitude = radToDeg(asin(sinAltitude));
	float alpha = twilightAlpha(altitude);
	// Discard completely transparent fragments.
	if (alpha <= 0.001) {
		discard;
	}
	fragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;
		const program = this.compileProgram(gl, vertexSource, fragmentSource);
		const uniforms = [
			"u_projection_fallback_matrix",
			"u_projection_matrix",
			"u_projection_tile_mercator_coords",
			"u_projection_clipping_plane",
			"u_projection_transition",
			"u_sunLonLat",
			"u_opacities"
		];
		const locations = { aPos: gl.getAttribLocation(program, "a_pos")};
		for (const name of uniforms) {
			locations[name] = gl.getUniformLocation(program, name);
		}
		const result = { program, locations };
		this.programs.set(key, result);
		return result;
	}
	compileProgram(gl, vertexSource, fragmentSource) {
		const compile = (type, source) => {
			const shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				const message = gl.getShaderInfoLog(shader);
				gl.deleteShader(shader);
				throw new Error(`Terminator shader error:\n${message}`);
			}
			return shader;
		};
		const vs = compile(gl.VERTEX_SHADER, vertexSource);
		const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
		const program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const message = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error(`Terminator link error:\n${message}`);
		}
		return program;
	}
	render(gl, args) {
		if (!this.buffer) return;
		const { program, locations: u } = this.getProgram(gl, args.shaderData);
		const p = args.defaultProjectionData;
		gl.useProgram(program);
		// Required by MapLibre's projection shader helpers.
		gl.uniformMatrix4fv(
			u.u_projection_fallback_matrix,
			false,
			p.fallbackMatrix
		);
		gl.uniformMatrix4fv(
			u.u_projection_matrix,
			false,
			p.mainMatrix
		);
		gl.uniform4fv(
			u.u_projection_tile_mercator_coords,
			p.tileMercatorCoords
		);
		gl.uniform4fv(
			u.u_projection_clipping_plane,
			p.clippingPlane
		);
		gl.uniform1f(
			u.u_projection_transition,
			p.projectionTransition
		);
		gl.uniform2f(
			u.u_sunLonLat,
			this.sun.longitude,
			this.sun.latitude
		);
		gl.uniform4fv(
			u.u_opacities,
			this.opacities
		);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.enableVertexAttribArray(u.aPos);
		gl.vertexAttribPointer(
			u.aPos,
			2,
			gl.FLOAT,
			false,
			0,
			0
		);
		// Standard alpha blending for a black translucent overlay.
		gl.enable(gl.BLEND);
		gl.blendFunc(
			gl.SRC_ALPHA,
			gl.ONE_MINUS_SRC_ALPHA
		);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.drawArrays(
			gl.TRIANGLES,
			0,
			this.vertexCount
		);
		// Reset attribute/buffer/program bindings.
		gl.disableVertexAttribArray(u.aPos);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.useProgram(null);
	}
	onRemove(map, gl) {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
		if (this.buffer) {
			gl.deleteBuffer(this.buffer);
			this.buffer = null;
		}
		for (const { program } of this.programs.values()) {
			gl.deleteProgram(program);
		}
		this.programs.clear();
		this.map = null;
		this.gl = null;
	}
}
/**
 * Approximate subsolar point from a JavaScript Date.
 * UTC is used internally through the Unix timestamp.
 */
export function getSubsolarPoint(date = new Date()) {
	const rad = Math.PI / 180;
	const deg = 180 / Math.PI;
	const normalize360 = x => ((x % 360) + 360) % 360;
	const jd = date.getTime() / 86400000 + 2440587.5;
	const T = (jd - 2451545.0) / 36525.0;
	const L0 = normalize360( 280.46646 + T * (36000.76983 + 0.0003032 * T) );
	const M = ( 357.52911 + T * (35999.05029 - 0.0001537 * T) ) * rad;
	const C =
		Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
		Math.sin(2 * M) * (0.019993 - 0.000101 * T) +
		Math.sin(3 * M) * 0.000289;
	const trueLongitude = L0 + C;
	const omega = (125.04 - 1934.136 * T) * rad;
	const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega);
	const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813));
	const meanObliquity = 23 + (26 + seconds / 60) / 60;
	const obliquity = (meanObliquity + 0.00256 * Math.cos(omega)) * rad;
	const lambda = apparentLongitude * rad;
	const rightAscension = Math.atan2(
		Math.cos(obliquity) * Math.sin(lambda),
		Math.cos(lambda)
	);
	const declination = Math.asin( Math.sin(obliquity) * Math.sin(lambda) );
	const gmst = normalize360(
		280.46061837 +
		360.98564736629 * (jd - 2451545.0) +
		0.000387933 * T * T -
		T * T * T / 38710000.0
	);
	const longitude = ( ((rightAscension * deg - gmst + 180) % 360 + 360) % 360 ) - 180;
	return {
		longitude,
		latitude: declination * deg
	};
}
