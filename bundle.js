(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

(function()
{
	let objs = require("./objects.js");

	let glsl = require("glslify");

	let label = document.getElementById("label");
	let info = document.getElementById("info");

	let canvas = document.getElementById("c");
	let gl = canvas.getContext("webgl");
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	let vbo = gl.createBuffer();

	let vertices = new Float32Array([
		-1.0, -1.0, 0.0, 0.0, 0.0,
		1.0, -1.0, 0.0, 1.0, 0.0,
		-1.0, 1.0, 0.0, 0.0, 1.0,
		1.0, 1.0, 0.0, 1.0, 1.0
		]);

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	let ibo = gl.createBuffer();

	let indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);


	let vs_source = `
		attribute vec3 a_pos;
		attribute vec2 a_uv;

		varying vec2 v_uv;

		void main(void)
		{
			v_uv = a_uv;
			gl_Position = vec4(a_pos, 1.0);
		}
	`;

	let scene = new objs.SmoothUnion(
		new objs.Sphere(new objs.Vec3(-1, 0, 0), 1.2),
		new objs.Sphere(new objs.Vec3(1, 0, 0), 1.2),
		//new objs.Box(new objs.Vec3(1, 0, 0), new objs.Vec3(0.8, 0.8, 0.8)),
		0.8
		);

	let fs_source = glsl(["\n\t\tprecision highp float;\n#define GLSLIFY 1\n\n\t\tvarying vec2 v_uv;\n\n\t\tuniform float time;\n\t\tuniform vec2 resolution;\n\n\t\tvec2 scene(vec3 p);\n\n\t\t// Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir, float maxd, float precis) {\n  float latest = precis * 2.0;\n  float dist   = +0.0;\n  float type   = -1.0;\n  vec2  res    = vec2(-1.0, -1.0);\n\n  for (int i = 0; i < 90; i++) {\n    if (latest < precis || dist > maxd) break;\n\n    vec2 result = scene(rayOrigin + rayDir * dist);\n\n    latest = result.x;\n    type   = result.y;\n    dist  += latest;\n  }\n\n  if (dist < maxd) {\n    res = vec2(dist, type);\n  }\n\n  return res;\n}\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir) {\n  return calcRayIntersection(rayOrigin, rayDir, 20.0, 0.001);\n}\n\n\t\t// Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec3 calcNormal(vec3 pos, float eps) {\n  const vec3 v1 = vec3( 1.0,-1.0,-1.0);\n  const vec3 v2 = vec3(-1.0,-1.0, 1.0);\n  const vec3 v3 = vec3(-1.0, 1.0,-1.0);\n  const vec3 v4 = vec3( 1.0, 1.0, 1.0);\n\n  return normalize( v1 * scene( pos + v1*eps ).x +\n                    v2 * scene( pos + v2*eps ).x +\n                    v3 * scene( pos + v3*eps ).x +\n                    v4 * scene( pos + v4*eps ).x );\n}\n\nvec3 calcNormal(vec3 pos) {\n  return calcNormal(pos, 0.002);\n}\n\n\t\tmat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {\n  vec3 rr = vec3(sin(roll), cos(roll), 0.0);\n  vec3 ww = normalize(target - origin);\n  vec3 uu = normalize(cross(ww, rr));\n  vec3 vv = normalize(cross(uu, ww));\n\n  return mat3(uu, vv, ww);\n}\n\nvec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) {\n  return normalize(camMat * vec3(screenPos, lensLength));\n}\n\nvec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {\n  mat3 camMat = calcLookAtMatrix(origin, target, 0.0);\n  return getRay(camMat, screenPos, lensLength);\n}\n\n\t\t//\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec4 mod289(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nfloat mod289(float x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nvec4 permute(vec4 x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nfloat permute(float x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip)\n  {\n  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n  vec4 p,s;\n\n  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n  s = vec4(lessThan(p, vec4(0.0)));\n  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n  return p;\n  }\n\n// (sqrt(5) - 1)/4 = F4, used once below\n#define F4 0.309016994374947451\n\nfloat snoise(vec4 v)\n  {\n  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4\n                        0.276393202250021,  // 2 * G4\n                        0.414589803375032,  // 3 * G4\n                       -0.447213595499958); // -1 + 4 * G4\n\n// First corner\n  vec4 i  = floor(v + dot(v, vec4(F4)) );\n  vec4 x0 = v -   i + dot(i, C.xxxx);\n\n// Other corners\n\n// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)\n  vec4 i0;\n  vec3 isX = step( x0.yzw, x0.xxx );\n  vec3 isYZ = step( x0.zww, x0.yyz );\n//  i0.x = dot( isX, vec3( 1.0 ) );\n  i0.x = isX.x + isX.y + isX.z;\n  i0.yzw = 1.0 - isX;\n//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );\n  i0.y += isYZ.x + isYZ.y;\n  i0.zw += 1.0 - isYZ.xy;\n  i0.z += isYZ.z;\n  i0.w += 1.0 - isYZ.z;\n\n  // i0 now contains the unique values 0,1,2,3 in each channel\n  vec4 i3 = clamp( i0, 0.0, 1.0 );\n  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n  //  x0 = x0 - 0.0 + 0.0 * C.xxxx\n  //  x1 = x0 - i1  + 1.0 * C.xxxx\n  //  x2 = x0 - i2  + 2.0 * C.xxxx\n  //  x3 = x0 - i3  + 3.0 * C.xxxx\n  //  x4 = x0 - 1.0 + 4.0 * C.xxxx\n  vec4 x1 = x0 - i1 + C.xxxx;\n  vec4 x2 = x0 - i2 + C.yyyy;\n  vec4 x3 = x0 - i3 + C.zzzz;\n  vec4 x4 = x0 + C.wwww;\n\n// Permutations\n  i = mod289(i);\n  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n  vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope\n// 7*7*6 = 294, which is close to the ring size 17*17 = 289.\n  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n  vec4 p0 = grad4(j0,   ip);\n  vec4 p1 = grad4(j1.x, ip);\n  vec4 p2 = grad4(j1.y, ip);\n  vec4 p3 = grad4(j1.z, ip);\n  vec4 p4 = grad4(j1.w, ip);\n\n// Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n  p4 *= taylorInvSqrt(dot(p4,p4));\n\n// Mix contributions from the five corners\n  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);\n  m0 = m0 * m0;\n  m1 = m1 * m1;\n  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n\n  }\n\n\t\tfloat smin(float a, float b, float k) {\n  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);\n  return mix(b, a, h) - k * h * (1.0 - h);\n}\n\n\t\tvec2 scene(vec3 p)\n\t\t{\n\t\t\treturn vec2(",", 0.0);\n\t\t}\n\n\t\tvoid main(void)\n\t\t{\n\t\t\tvec2 pos = v_uv * 2.0 - 1.0;\n\t\t\tpos.x *= (resolution.x / resolution.y);\n\t\t\tvec3 color = vec3(0.0);\n\t\t\tvec3 ro = vec3(0, 0, 4);\n\t\t\tvec3 rd = getRay(ro, vec3(0, 0, 0), pos, 2.0);\n\n\t\t\tvec2 t = calcRayIntersection(ro, rd);\n\t\t\tif (t.x > -0.5)\n\t\t\t{\n\t\t\t\tvec3 pos = ro + rd * t.x;\n\t\t\t\tvec3 nor = calcNormal(pos);\n\n\t\t\t\tcolor = nor * 0.5 + 0.5;\n\t\t\t}\n\n\t\t\tgl_FragColor = vec4(color, 1.0);\n\t\t}\n\t",""],scene.emit());

	function compile_shader(type, source)
	{
		let shader = gl.createShader(type);
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) != true)
		{
			let log = gl.getShaderInfoLog(shader);
			gl.deleteShader(shader);

			console.log(source);
			console.log(log);

			return null;
		}

		return shader;
	}

	function create_program(vs_source, fs_source)
	{
		let vs = compile_shader(gl.VERTEX_SHADER, vs_source);
		let fs = compile_shader(gl.FRAGMENT_SHADER, fs_source);

		if (null == vs || null == fs)
			return null;

		let program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);

		if (gl.getProgramParameter(program, gl.LINK_STATUS) != true)
		{
			let log = gl.getProgramInfoLog(program);
			gl.deleteShader(vs);
			gl.deleteShader(fs);
			gl.deleteProgram(program);

			console.log(log);
			return null;
		}

		return program;
	}


	info.innerHTML = "Max Fragment Uniform Vectors: " + gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS);

	let program = create_program(vs_source, fs_source);
	gl.useProgram(program);

	let loc_a_pos = gl.getAttribLocation(program, "a_pos");
	let loc_a_uv = gl.getAttribLocation(program, "a_uv");

	let loc_u_time = gl.getUniformLocation(program, "time");
	let loc_u_resolution = gl.getUniformLocation(program, "resolution");

	gl.enableVertexAttribArray(loc_a_pos);
	gl.enableVertexAttribArray(loc_a_uv);

	gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0);
	gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12);

	gl.uniform2f(loc_u_resolution, canvas.width, canvas.height);

	let total_time = 0.0;

	function render(timestamp)
	{
		total_time = timestamp / 1000.0;

		if (label) label.innerHTML = "Time: " + total_time;

		gl.uniform1f(loc_u_time, total_time);

		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

		window.requestAnimationFrame(render);
	}

	render(0.0);
})();


},{"./objects.js":3,"glslify":2}],2:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}],3:[function(require,module,exports){


function emit_float(a) {
	if (a % 1 === 0)
		return a.toFixed(1);
	else
		return a;
}

let Vec3 = function (x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
};

Vec3.prototype = {
	x: 0.0,
	y: 0.0, 
	z: 0.0,
	emit: function() { return "vec3(" + this.x + "," + this.y + "," + this.z + ")"; }
};

let SceneNode = function () {}

SceneNode.prototype = {
	emit: function() { return "#NotImplemented#"; }
};


let Sphere = function (c, r) {
	this.center = c;
	this.radius = r;
};

Sphere.prototype = new SceneNode();

Sphere.prototype.emit = function () {
	return "length(p - " + this.center.emit() + ") - " + emit_float(this.radius); 
};

let Box = function (c, s) {
	this.center = c;
	this.size =  s;
};

Box.prototype = new SceneNode();

Box.prototype.emit = function () {
	return "length(max(abs(p - " + this.center.emit() + ") - " + this.size.emit() + ", 0.0))";
}

let Union = function (a, b) {
	this.a = a;
	this.b = b;
};

Union.prototype = new SceneNode();

Union.prototype.emit = function () {
	return "min(" + this.a.emit() + ", " + this.b.emit() + ")";
};

let SmoothUnion = function (a, b, k) {
	this.a = a;
	this.b = b;
	this.k = k || 0.8;
};

SmoothUnion.prototype = new SceneNode();

SmoothUnion.prototype.emit = function () {
	return "smin(" + this.a.emit() + ", " + this.b.emit() + ", " + emit_float(this.k) + ")";
};


module.exports = {
	Vec3: Vec3,
	SceneNode: SceneNode,
	Sphere: Sphere,
	Box: Box,
	Union: Union,
	SmoothUnion: SmoothUnion
};
},{}]},{},[1]);
