(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

(function()
{
	let objs = require("./objects.js");

	let glsl = require("glslify");

	let label = document.getElementById("label");
	let info = document.getElementById("info");
	let output_code = document.getElementById("output_code");

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
	
	let obj1 = new objs.Sphere(new objs.Vec3(-1, 0, 0), 1.2);
	//let obj2 = new objs.Sphere(new objs.Vec3(1, 0, 0), 1.2);
	//let obj2 = new objs.RoundBox(new objs.Vec3(1, 0, 0), new objs.Vec3(0.8, 0.8, 0.8), 0.1);
	let obj2 = new objs.Box(new objs.Vec3(1.0, -0.8, 1.0), new objs.Vec3(0.2, 0.2, 0.2));
	let ground = new objs.Plane(new objs.Vec3(0, 1, 0), 1.0);
	//let ground = new objs.RoundBox(new objs.Vec3(1, 0, 0), new objs.Vec3(0.8, 0.8, 0.8), 0.1);
	let obj3 = new objs.Capsule(new objs.Vec3(1, 0, 0), new objs.Vec3(1, 1, 0));

	let scene = new objs.Union(new objs.Union(new objs.SmoothUnion(obj1, obj3), obj2), ground);

	let fs_source = glsl(["\n\t\tprecision highp float;\n#define GLSLIFY 1\n\n\t\tvarying vec2 v_uv;\n\n\t\tuniform float time;\n\t\tuniform vec2 resolution;\n\t\tuniform float matTexSize;\n\t\tuniform sampler2D uMatSampler;\n\n\t\t","\n\n\t\tvec2 scene(vec3 p);\n\n\t\t// Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir, float maxd, float precis) {\n  float latest = precis * 2.0;\n  float dist   = +0.0;\n  float type   = -1.0;\n  vec2  res    = vec2(-1.0, -1.0);\n\n  for (int i = 0; i < 90; i++) {\n    if (latest < precis || dist > maxd) break;\n\n    vec2 result = scene(rayOrigin + rayDir * dist);\n\n    latest = result.x;\n    type   = result.y;\n    dist  += latest;\n  }\n\n  if (dist < maxd) {\n    res = vec2(dist, type);\n  }\n\n  return res;\n}\n\nvec2 calcRayIntersection(vec3 rayOrigin, vec3 rayDir) {\n  return calcRayIntersection(rayOrigin, rayDir, 20.0, 0.001);\n}\n\n\t\t// Originally sourced from https://www.shadertoy.com/view/ldfSWs\n// Thank you Iñigo :)\n\nvec3 calcNormal(vec3 pos, float eps) {\n  const vec3 v1 = vec3( 1.0,-1.0,-1.0);\n  const vec3 v2 = vec3(-1.0,-1.0, 1.0);\n  const vec3 v3 = vec3(-1.0, 1.0,-1.0);\n  const vec3 v4 = vec3( 1.0, 1.0, 1.0);\n\n  return normalize( v1 * scene( pos + v1*eps ).x +\n                    v2 * scene( pos + v2*eps ).x +\n                    v3 * scene( pos + v3*eps ).x +\n                    v4 * scene( pos + v4*eps ).x );\n}\n\nvec3 calcNormal(vec3 pos) {\n  return calcNormal(pos, 0.002);\n}\n\n\t\tmat3 calcLookAtMatrix(vec3 origin, vec3 target, float roll) {\n  vec3 rr = vec3(sin(roll), cos(roll), 0.0);\n  vec3 ww = normalize(target - origin);\n  vec3 uu = normalize(cross(ww, rr));\n  vec3 vv = normalize(cross(uu, ww));\n\n  return mat3(uu, vv, ww);\n}\n\nvec3 getRay(mat3 camMat, vec2 screenPos, float lensLength) {\n  return normalize(camMat * vec3(screenPos, lensLength));\n}\n\nvec3 getRay(vec3 origin, vec3 target, vec2 screenPos, float lensLength) {\n  mat3 camMat = calcLookAtMatrix(origin, target, 0.0);\n  return getRay(camMat, screenPos, lensLength);\n}\n\n\t\t//\n// Description : Array and textureless GLSL 2D/3D/4D simplex\n//               noise functions.\n//      Author : Ian McEwan, Ashima Arts.\n//  Maintainer : ijm\n//     Lastmod : 20110822 (ijm)\n//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.\n//               Distributed under the MIT License. See LICENSE file.\n//               https://github.com/ashima/webgl-noise\n//\n\nvec4 mod289(vec4 x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nfloat mod289(float x) {\n  return x - floor(x * (1.0 / 289.0)) * 289.0; }\n\nvec4 permute(vec4 x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nfloat permute(float x) {\n     return mod289(((x*34.0)+1.0)*x);\n}\n\nvec4 taylorInvSqrt(vec4 r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nfloat taylorInvSqrt(float r)\n{\n  return 1.79284291400159 - 0.85373472095314 * r;\n}\n\nvec4 grad4(float j, vec4 ip)\n  {\n  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);\n  vec4 p,s;\n\n  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;\n  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);\n  s = vec4(lessThan(p, vec4(0.0)));\n  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;\n\n  return p;\n  }\n\n// (sqrt(5) - 1)/4 = F4, used once below\n#define F4 0.309016994374947451\n\nfloat snoise(vec4 v)\n  {\n  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4\n                        0.276393202250021,  // 2 * G4\n                        0.414589803375032,  // 3 * G4\n                       -0.447213595499958); // -1 + 4 * G4\n\n// First corner\n  vec4 i  = floor(v + dot(v, vec4(F4)) );\n  vec4 x0 = v -   i + dot(i, C.xxxx);\n\n// Other corners\n\n// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)\n  vec4 i0;\n  vec3 isX = step( x0.yzw, x0.xxx );\n  vec3 isYZ = step( x0.zww, x0.yyz );\n//  i0.x = dot( isX, vec3( 1.0 ) );\n  i0.x = isX.x + isX.y + isX.z;\n  i0.yzw = 1.0 - isX;\n//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );\n  i0.y += isYZ.x + isYZ.y;\n  i0.zw += 1.0 - isYZ.xy;\n  i0.z += isYZ.z;\n  i0.w += 1.0 - isYZ.z;\n\n  // i0 now contains the unique values 0,1,2,3 in each channel\n  vec4 i3 = clamp( i0, 0.0, 1.0 );\n  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );\n  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );\n\n  //  x0 = x0 - 0.0 + 0.0 * C.xxxx\n  //  x1 = x0 - i1  + 1.0 * C.xxxx\n  //  x2 = x0 - i2  + 2.0 * C.xxxx\n  //  x3 = x0 - i3  + 3.0 * C.xxxx\n  //  x4 = x0 - 1.0 + 4.0 * C.xxxx\n  vec4 x1 = x0 - i1 + C.xxxx;\n  vec4 x2 = x0 - i2 + C.yyyy;\n  vec4 x3 = x0 - i3 + C.zzzz;\n  vec4 x4 = x0 + C.wwww;\n\n// Permutations\n  i = mod289(i);\n  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);\n  vec4 j1 = permute( permute( permute( permute (\n             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))\n           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))\n           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))\n           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));\n\n// Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope\n// 7*7*6 = 294, which is close to the ring size 17*17 = 289.\n  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;\n\n  vec4 p0 = grad4(j0,   ip);\n  vec4 p1 = grad4(j1.x, ip);\n  vec4 p2 = grad4(j1.y, ip);\n  vec4 p3 = grad4(j1.z, ip);\n  vec4 p4 = grad4(j1.w, ip);\n\n// Normalise gradients\n  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));\n  p0 *= norm.x;\n  p1 *= norm.y;\n  p2 *= norm.z;\n  p3 *= norm.w;\n  p4 *= taylorInvSqrt(dot(p4,p4));\n\n// Mix contributions from the five corners\n  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);\n  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);\n  m0 = m0 * m0;\n  m1 = m1 * m1;\n  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))\n               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;\n\n  }\n\n\t\tfloat smin(float a, float b, float k) {\n  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);\n  return mix(b, a, h) - k * h * (1.0 - h);\n}\n\n\t\t// PRIMITIVES\n\t\tfloat sdPlane( vec3 p, vec4 n )\n{\n  // n must be normalized\n  return dot(p,n.xyz) + n.w;\n}\n\n\t\tfloat sdBox( vec3 p, vec3 b )\n{\n  vec3 d = abs(p) - b;\n  return min(max(d.x,max(d.y,d.z)),0.0) +\n         length(max(d,0.0));\n}\n\n\t\tfloat udRoundBox( vec3 p, vec3 b, float r )\n{\n  return length(max(abs(p)-b,0.0))-r;\n}\n\n\t\tfloat sdTorus( vec3 p, vec2 t )\n{\n  vec2 q = vec2(length(p.xz)-t.x,p.y);\n  return length(q)-t.y;\n}\n\n\t\tfloat sdCapsule( vec3 p, vec3 a, vec3 b, float r )\n{\n    vec3 pa = p - a, ba = b - a;\n    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );\n    return length( pa - ba*h ) - r;\n}\n\n\t\tfloat sdTriPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);\n}\n\n\t\tfloat sdHexPrism( vec3 p, vec2 h )\n{\n    vec3 q = abs(p);\n    return max(q.z-h.y,max((q.x*0.866025+q.y*0.5),q.y)-h.x);\n}\n\n\t\tfloat sdSphere( vec3 p, float s )\n{\n  return length( p ) - s;\n}\n\n\t\tfloat dot2_1( in vec3 v ) { return dot(v,v); }\nfloat udQuad( vec3 p, vec3 a, vec3 b, vec3 c, vec3 d )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 dc = d - c; vec3 pc = p - c;\n    vec3 ad = a - d; vec3 pd = p - d;\n    vec3 nor = cross( ba, ad );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(dc,nor),pc)) +\n     sign(dot(cross(ad,nor),pd))<3.0)\n     ?\n     min( min( min(\n     dot2_1(ba*clamp(dot(ba,pa)/dot2_1(ba),0.0,1.0)-pa),\n     dot2_1(cb*clamp(dot(cb,pb)/dot2_1(cb),0.0,1.0)-pb) ),\n     dot2_1(dc*clamp(dot(dc,pc)/dot2_1(dc),0.0,1.0)-pc) ),\n     dot2_1(ad*clamp(dot(ad,pd)/dot2_1(ad),0.0,1.0)-pd) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2_1(nor) );\n}\n\n\t\tfloat dot2_0( in vec3 v ) { return dot(v,v); }\nfloat udTriangle( vec3 p, vec3 a, vec3 b, vec3 c )\n{\n    vec3 ba = b - a; vec3 pa = p - a;\n    vec3 cb = c - b; vec3 pb = p - b;\n    vec3 ac = a - c; vec3 pc = p - c;\n    vec3 nor = cross( ba, ac );\n\n    return sqrt(\n    (sign(dot(cross(ba,nor),pa)) +\n     sign(dot(cross(cb,nor),pb)) +\n     sign(dot(cross(ac,nor),pc))<2.0)\n     ?\n     min( min(\n     dot2_0(ba*clamp(dot(ba,pa)/dot2_0(ba),0.0,1.0)-pa),\n     dot2_0(cb*clamp(dot(cb,pb)/dot2_0(cb),0.0,1.0)-pb) ),\n     dot2_0(ac*clamp(dot(ac,pc)/dot2_0(ac),0.0,1.0)-pc) )\n     :\n     dot(nor,pa)*dot(nor,pa)/dot2_0(nor) );\n}\n\n\t\tfloat sdCappedCone( vec3 p, vec2 c )\n{\n    // c must be normalized\n    float q = length(p.xy);\n    return dot(c,vec2(q,p.z));\n}\n\n\t\tfloat sdCylinder( vec3 p, vec3 c )\n{\n  return length( p.xz - c.xy ) - c.z;\n}\n\n\t\tfloat sdCone( in vec3 p, in vec3 c )\n{\n    vec2 q = vec2( length(p.xz), p.y );\n    float d1 = -p.y-c.z;\n    float d2 = max( dot(q,c.xy), p.y);\n    return length(max(vec2(d1,d2),0.0)) + min(max(d1,d2), 0.);\n}\n\n\t\tfloat sdCappedCylinder( vec3 p, vec2 h )\n{\n  vec2 d = abs(vec2(length(p.xz),p.y)) - h;\n  return min(max(d.x,d.y),0.0) + length(max(d,0.0));\n}\n\n\t\t// OPS\n\t\tfloat opU( float d1, float d2 )\n{\n    return min(d1,d2);\n}\n\nvec2 opU( vec2 d1, vec2 d2 ){\n\treturn ( d1.x < d2.x ) ? d1 : d2;\n}\n\n\t\tfloat opI( float d1, float d2 )\n{\n    return max(d1,d2);\n}\n\n\t\tfloat opS( float d1, float d2 )\n{\n    return max(-d1,d2);\n}\n\n\t\tfloat ao( in vec3 pos, in vec3 nor )\n{\n\tfloat occ = 0.0;\n    float sca = 1.0;\n    for( int i=0; i<5; i++ )\n    {\n        float hr = 0.01 + 0.12 * float( i ) / 4.0;\n        vec3 aopos =  nor * hr + pos;\n        float dd = scene ( aopos ).x;\n        occ += -(dd-hr)*sca;\n        sca *= 0.95;\n    }\n    return clamp( 1.0 - 3.0*occ, 0.0, 1.0 );    \n}\n\n\t\tfloat softshadow( in vec3 ro, in vec3 rd, in float mint, in float tmax )\n{\n\tfloat res = 1.0;\n    float t = mint;\n    for( int i=0; i<16; i++ )\n    {\n\t\tfloat h = scene ( ro + rd*t ).x;\n        res = min( res, 8.0*h/t );\n        t += clamp( h, 0.02, 0.10 );\n        if( h<0.001 || t>tmax ) break;\n    }\n    return clamp( res, 0.0, 1.0 );\n}\n\n\t\tvec2 opSmoothUnion(vec2 a, vec2 b, float k)\n\t\t{\n\t\t\treturn vec2(smin(a.x, b.x, k), a.y);\n\t\t}\n\n\t\tvec2 scene(vec3 p)\n\t\t{\n\t\t\treturn ",";\n\t\t}\n\n\t\tvec3 lighting( vec3 pos, vec3 nor, vec3 ro, vec3 rd) {\n\n\t\t\tvec3  ref = reflect( rd, nor );\n\t\t\tfloat occ = ao( pos, nor );\n\t\t\tvec3  lig = normalize( vec3(-0.6, 0.7, -0.5) );\n\t\t\tfloat amb = clamp( 0.5+0.5*nor.y, 0.0, 1.0 );\n\t\t\tfloat dif = clamp( dot( nor, lig ), 0.0, 1.0 );\n\t\t\tfloat bac = clamp( dot( nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0 )*clamp( 1.0-pos.y,0.0,1.0);\n\t\t\tfloat dom = smoothstep( -0.1, 0.1, ref.y );\n\t\t\tfloat fre = pow( clamp(1.0+dot(nor,rd),0.0,1.0), 2.0 );\n\t\t\tfloat spe = pow(clamp( dot( ref, lig ), 0.0, 1.0 ),16.0);\n\n\t\t\tdif *= softshadow( pos, lig, 0.02, 2.5 );\n\t\t\tdom *= softshadow( pos, ref, 0.02, 2.5 );\n\n\t\t\tvec3 brdf = vec3(0.0);\n\t\t\tbrdf += 1.20 * dif * vec3(1.00,0.90,0.60);\n\t\t\tbrdf += 1.20 * spe * vec3(1.00,0.90,0.60) * dif;\n\t\t\tbrdf += 0.30 * amb * vec3(0.50,0.70,1.00) * occ;\n\t\t\tbrdf += 0.40 * dom * vec3(0.50,0.70,1.00) * occ;\n\t\t\tbrdf += 0.30 * bac * vec3(0.25,0.25,0.25) * occ;\n\t\t\tbrdf += 0.40 * fre * vec3(1.00,1.00,1.00) * occ;\n\t\t\tbrdf += 0.02;\n\n\t\t\treturn brdf;\n\t\t}\n\n\t\tvoid main(void)\n\t\t{\n\t\t\tvec2 pos = v_uv * 2.0 - 1.0;\n\t\t\tpos.x *= (resolution.x / resolution.y);\n\t\t\tvec3 color = vec3(0.0);\n\t\t\tvec3 ro = vec3(0, 0, 4);\n\t\t\tvec3 rd = getRay(ro, vec3(0, 0, 0), pos, 2.0);\n\n\t\t\tvec2 t = calcRayIntersection(ro, rd);\n\t\t\tif (t.x > -0.5)\n\t\t\t{\n\t\t\t\tvec3 pos = ro + rd * t.x;\n\t\t\t\tvec3 nor = calcNormal(pos);\n\n\t\t\t\tcolor = lighting(pos, nor, ro, rd) * texture2D(uMatSampler, vec2(t.y / matTexSize, 0)).rgb;\n\t\t\t}\n\n\t\t\tgl_FragColor = vec4(color, 1.0);\n\t\t}\n\t",""],scene.emit_decl(),scene.emit());

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
	output_code.value = fs_source;

	let program = create_program(vs_source, fs_source);
	gl.useProgram(program);

	let loc_a_pos = gl.getAttribLocation(program, "a_pos");
	let loc_a_uv = gl.getAttribLocation(program, "a_uv");

	let loc_u_time = gl.getUniformLocation(program, "time");
	let loc_u_resolution = gl.getUniformLocation(program, "resolution");

	scene.update_location(gl, program);

	gl.enableVertexAttribArray(loc_a_pos);
	gl.enableVertexAttribArray(loc_a_uv);

	gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0);
	gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12);

	gl.uniform2f(loc_u_resolution, canvas.width, canvas.height);

	const matTexSize = 512;
	let matTexData = new Uint8Array(matTexSize * 4);
	let matTexDataDirty = false;

	let matTex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, matTex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, matTexSize, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, matTexData);
	
	// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	// gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	let matTexLoc = gl.getUniformLocation(program, "uMatSampler");
	let matTexSizeLoc = gl.getUniformLocation(program, "matTexSize");

	gl.activeTexture(gl.TEXTURE0);
	gl.uniform1i(matTexLoc, 0);
	gl.uniform1f(matTexSizeLoc, matTexSize);

	let total_time = 0.0;

	function clamp255(v)
	{
		return Math.min(Math.max(0, v * 255), 255);
	}
	function updateMaterial(id, color)
	{
		matTexData[id * 4] = clamp255(color[0]);
		matTexData[id * 4 + 1] = clamp255(color[1]);
		matTexData[id * 4 + 2] = clamp255(color[2]);
		matTexData[id * 4 + 3] = clamp255(color[3]);
		matTexDataDirty = true;
	}

	updateMaterial(0, [1, 0.3, 0.3, 1]);
	updateMaterial(1, [0.3, 1, 0.3, 1]);
	updateMaterial(2, [0.3, 0.3, 1, 1]);
	updateMaterial(3, [0.3, 0.3, 1, 1]);

	function render(timestamp)
	{
		total_time = timestamp / 1000.0;

		if (label) label.innerHTML = "Time: " + total_time;

		gl.uniform1f(loc_u_time, total_time);

		obj1.center.set(new objs.Vec3(-1 + 0.5 * Math.sin(total_time), 0, 0));
		obj3.radius.set(0.2 + 0.1 * Math.sin(total_time));

		scene.upload_data(gl);

		if (matTexDataDirty)
		{
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, matTexSize, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, matTexData);
			matTexDataDirty = false;
		}

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

VarAlloc = {
	current: 0,
	alloc : function() {
		return VarAlloc.current++;
	}
};

MaterialIDAlloc = {
	current: 0,
	alloc : function() {
		return MaterialIDAlloc.current++;
	}
};

let Float = function (x) {
	this.x = x;
}

Float.prototype = {
	x: 0.0,
	emit: function() { return emit_float(this.x); },
	emit_decl: function() { return ""; }
};

// Vec2

let Vec2 = function (x, y) {
	this.x = x;
	this.y = y;
};

Vec2.prototype = {
	x: 0.0,
	y: 0.0, 
	emit: function() { return "vec2(" + this.x + "," + this.y + ")"; },
	emit_decl: function() { return ""; }
};

// Vec3

let Vec3 = function (x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
};

Vec3.prototype = {
	x: 0.0,
	y: 0.0, 
	z: 0.0,
	emit: function() { return "vec3(" + this.x + "," + this.y + "," + this.z + ")"; },
	emit_decl: function() { return ""; }
};

// Vec4

let Vec4 = function (x, y, z, w) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.w = w;
};

Vec4.prototype = {
	x: 0.0,
	y: 0.0, 
	z: 0.0,
	w: 0.0,
	emit: function() { return "vec4(" + this.x + "," + this.y + "," + this.z + "," + this.w + ")"; },
	emit_decl: function() { return ""; }
};

// Var

let Var = function(v) {
	this.varName = "var" + VarAlloc.alloc();
	this.value = v;
	if (typeof v === 'number')
	{
		this.type = "float";
	}
	else if (v instanceof Vec2)
	{
		this.type = "vec2";
	}
	else if (v instanceof Vec3)
	{
		this.type = "vec3";
	}
	else if (v instanceof Vec4)
	{
		this.type = "vec4";
	}
	else
	{
		throw "invalid parameter";
	}
}

Var.prototype = {
	dirty: true,

	loc: -1,

	emit: function() { return this.varName; },

	emit_decl : function() { return "uniform " + this.type + " " + this.varName + ";\n"; },

	set: function(v) { this.value = v; this.dirty = true; },

	update_location: function(gl, program) {
		this.loc = gl.getUniformLocation(program, this.varName);
	},	

	upload_data: function(gl) {
		if (!this.dirty)
			return;
		
		let v = this.value;
		if (typeof v === 'number')
		{
			gl.uniform1f(this.loc, v);
		}
		else if (v instanceof Vec2)
		{
			gl.uniform2f(this.loc, v.x, v.y);
		}
		else if (v instanceof Vec3)
		{
			gl.uniform3f(this.loc, v.x, v.y, v.z);
		}
		else if (v instanceof Vec4)
		{
			gl.uniform4f(this.loc, v.x, v.y, v.z, v.w);
		}

		this.dirty = false;
	}
};

// Wraper

function param_wrap(v, d)
{
	if (v == undefined) return d();
	if (v instanceof Var)
		return v;
	
	return new Var(v);
}

function float_var_gen(x)
{
	return function() { return new Var(x); };
}

function vec2_var_gen(x, y)
{
	return function() { return new Var(new Vec2(x, y)); };
}

function vec3_var_gen(x, y, z)
{
	return function() { return new Var(new Vec3(x, y, z)); };
}

function vec4_var_gen(x, y, z, w)
{
	return function() { return new Var(new Vec2(x, y, z, w)); };
}

// SceneNode

let SceneNode = function () {}

SceneNode.prototype = {
	emit: function() { return "#NotImplemented#"; },

	emit_decl: function() { return ""; },

	update_location: function(gl, program) {},

	upload_data: function(gl) {}
};

// Sphere

let Sphere = function (c, r) {
	this.center = param_wrap(c, vec3_var_gen(0.0, 0.0, 0.0));
	this.radius = param_wrap(r, float_var_gen(1.0));
	this.matId = MaterialIDAlloc.alloc();
};

Sphere.prototype = new SceneNode();

Sphere.prototype.emit = function () {
	return "vec2(sdSphere(p - " + this.center.emit() + ", " + this.radius.emit() + "), " + this.matId + ")"; 
};

Sphere.prototype.emit_decl = function() {
	return this.center.emit_decl() + this.radius.emit_decl();
}

Sphere.prototype.update_location = function(gl, program) {
	this.center.update_location(gl, program);
	this.radius.update_location(gl, program);
}

Sphere.prototype.upload_data = function(gl) {
	this.center.upload_data(gl);
	this.radius.upload_data(gl);
}

// Box

let Box = function (c, s) {
	this.center = param_wrap(c, vec3_var_gen(0.0, 0.0, 0.0));
	this.size =  param_wrap(s, vec3_var_gen(1.0, 1.0, 1.0));
	this.matId = MaterialIDAlloc.alloc();
};

Box.prototype = new SceneNode();

Box.prototype.emit = function () {
	return "vec2(sdBox(p - " + this.center.emit() + ", " + this.size.emit() + "), " + this.matId + ")";
}

Box.prototype.emit_decl = function() {
	return this.center.emit_decl() + this.size.emit_decl();
}

Box.prototype.update_location = function(gl, program) {
	this.center.update_location(gl, program);
	this.size.update_location(gl, program);
}

Box.prototype.upload_data = function(gl) {
	this.center.upload_data(gl);
	this.size.upload_data(gl);
}

// RoundBox

let RoundBox = function (c, s, r) {
	this.center = param_wrap(c, vec3_var_gen(0.0, 0.0, 0.0));
	this.size =  param_wrap(s, vec3_var_gen(1.0, 1.0, 1.0));
	this.radius = param_wrap(r, float_var_gen(0.1));
	this.matId = MaterialIDAlloc.alloc();
};

RoundBox.prototype = new SceneNode();

RoundBox.prototype.emit = function () {
	return "vec2(udRoundBox(p - " + this.center.emit() + ", " + this.size.emit() + ", " + this.radius.emit() + "), " + this.matId + ")";
}

RoundBox.prototype.emit_decl = function() {
	return this.center.emit_decl() + this.size.emit_decl() + this.radius.emit_decl();
}

RoundBox.prototype.update_location = function(gl, program) {
	this.center.update_location(gl, program);
	this.size.update_location(gl, program);
	this.radius.update_location(gl, program);
}

RoundBox.prototype.upload_data = function(gl) {
	this.center.upload_data(gl);
	this.size.upload_data(gl);
	this.radius.upload_data(gl);
}

// Torus

let Torus = function (c, r) {
	this.center = param_wrap(c, vec3_var_gen(0.0, 0.0, 0.0));
	this.radii =  param_wrap(r, vec2_var_gen(0.2, 0.05));
	this.matId = MaterialIDAlloc.alloc();
};

Torus.prototype = new SceneNode();

Torus.prototype.emit = function () {
	return "vec2(sdTorus(p - " + this.center.emit() + ", " + this.radii.emit() + "), " + this.matId + ")";
}

Torus.prototype.emit_decl = function() {
	return this.center.emit_decl() + this.radii.emit_decl();
}

Torus.prototype.update_location = function(gl, program) {
	this.center.update_location(gl, program);
	this.radii.update_location(gl, program);
}

Torus.prototype.upload_data = function(gl) {
	this.center.upload_data(gl);
	this.radii.upload_data(gl);
}

// Capsule

let Capsule = function (st, ed, r) {
	this.start = param_wrap(st, vec3_var_gen(0.0, 0.0, 0.0));
	this.end = param_wrap(ed, vec3_var_gen(0.0, 1.0, 0.0));
	this.radius = param_wrap(r, float_var_gen(0.5));
	this.matId = MaterialIDAlloc.alloc();
};

Capsule.prototype = new SceneNode();

Capsule.prototype.emit = function () {
	return "vec2(sdCapsule(p, " + this.start.emit() + ", " + this.end.emit() + ", " + this.radius.emit() + "), " + this.matId + ")";
};

Capsule.prototype.emit_decl = function() {
	return this.start.emit_decl() + this.end.emit_decl() + this.radius.emit_decl();
}

Capsule.prototype.update_location = function(gl, program) {
	this.start.update_location(gl, program);
	this.end.update_location(gl, program);
	this.radius.update_location(gl, program);
}

Capsule.prototype.upload_data = function(gl) {
	this.start.upload_data(gl);
	this.end.upload_data(gl);
	this.radius.upload_data(gl);
}

// Plane

let Plane = function (n, d) {
	this.normal = param_wrap(n, vec3_var_gen(0.0, 1.0, 0.0));
	this.distance = param_wrap(d, float_var_gen(0.0));
	this.matId = MaterialIDAlloc.alloc();
};

Plane.prototype = new SceneNode();

Plane.prototype.emit = function () {
	return "vec2(sdPlane(p, vec4(" + this.normal.emit() + ", " + this.distance.emit() + ")), " + this.matId + ")";
}

Plane.prototype.emit_decl = function() {
	return this.normal.emit_decl() + this.distance.emit_decl();
}

Plane.prototype.update_location = function(gl, program) {
	this.normal.update_location(gl, program);
	this.distance.update_location(gl, program);
}

Plane.prototype.upload_data = function(gl) {
	this.normal.upload_data(gl);
	this.distance.upload_data(gl);
}

// Cone

let Cone = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec3_var_gen(0.8, 0.6, 0.3));
	this.matId = MaterialIDAlloc.alloc();
};

Cone.prototype = new SceneNode();

Cone.prototype.emit = function () {
	return "vec2(sdCone(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

Cone.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

Cone.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

Cone.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}

// Cylinder

let Cylinder = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec2_var_gen(0.1, 0.2));
	this.matId = MaterialIDAlloc.alloc();
};

Cylinder.prototype = new SceneNode();

Cylinder.prototype.emit = function () {
	return "vec2(sdCylinder(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

Cylinder.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

Cylinder.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

Cylinder.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}


// CappedCone

let CappedCone = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec3_var_gen(0.8, 0.6, 0.3));
	this.matId = MaterialIDAlloc.alloc();
};

CappedCone.prototype = new SceneNode();

CappedCone.prototype.emit = function () {
	return "vec2(sdCappedCone(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

CappedCone.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

CappedCone.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

CappedCone.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}

// CappedCylinder

let CappedCylinder = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec2_var_gen(0.1, 0.2));
	this.matId = MaterialIDAlloc.alloc();
};

CappedCylinder.prototype = new SceneNode();

CappedCylinder.prototype.emit = function () {
	return "vec2(sdCappedCylinder(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

CappedCylinder.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

CappedCylinder.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

CappedCylinder.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}


// HexPrism

let HexPrism = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec2_var_gen(0.1, 0.2));
	this.matId = MaterialIDAlloc.alloc();
};

HexPrism.prototype = new SceneNode();

HexPrism.prototype.emit = function () {
	return "vec2(sdHexPrism(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

HexPrism.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

HexPrism.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

HexPrism.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}


// TriPrism

let TriPrism = function (p, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.dimension = param_wrap(d, vec2_var_gen(0.1, 0.2));
	this.matId = MaterialIDAlloc.alloc();
};

TriPrism.prototype = new SceneNode();

TriPrism.prototype.emit = function () {
	return "vec2(sdTriPrism(p - " + this.position.emit() + ", " + this.dimension.emit() + "), " + this.matId + ")";
}

TriPrism.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.dimension.emit_decl();
}

TriPrism.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.dimension.update_location(gl, program);
}

TriPrism.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.dimension.upload_data(gl);
}


// Quad

let Quad = function (p, a, b, c, d) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.v1 = param_wrap(a, vec3_var_gen(-0.2, -0.2, 0));
	this.v2 = param_wrap(b, vec3_var_gen( 0.2, -0.2, 0));
	this.v3 = param_wrap(c, vec3_var_gen( 0.2,  0.2, 0));
	this.v4 = param_wrap(d, vec3_var_gen(-0.2,  0.2, 0));
	this.matId = MaterialIDAlloc.alloc();
};

Quad.prototype = new SceneNode();

Quad.prototype.emit = function () {
	return "vec2(udQuad(p - " + this.position.emit() + ", " + this.v1.emit() + ", " + this.v2.emit() + ", " + this.v3.emit() + ", " + this.v4.emit() + "), " + this.matId + ")";
}

Quad.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.v1.emit_decl() + this.v2.emit_decl() + this.v3.emit_decl() + this.v4.emit_decl();
}

Quad.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.v1.update_location(gl, program);
	this.v2.update_location(gl, program);
	this.v3.update_location(gl, program);
	this.v4.update_location(gl, program);
}

Quad.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.v1.upload_data(gl);
	this.v2.upload_data(gl);
	this.v3.upload_data(gl);
	this.v4.upload_data(gl);
}

// Triangle

let Triangle = function (p, a, b, c) {
	this.position = param_wrap(p, vec3_var_gen(0.0, 0.0, 0.0));
	this.v1 = param_wrap(a, vec3_var_gen( 0.0,  0.2, 0));
	this.v2 = param_wrap(b, vec3_var_gen(-0.2,  0.0, 0));
	this.v3 = param_wrap(c, vec3_var_gen( 0.2,  0.0, 0));
	this.matId = MaterialIDAlloc.alloc();
};

Triangle.prototype = new SceneNode();

Triangle.prototype.emit = function () {
	return "vec2(udTriangle(p - " + this.position.emit() + ", " + this.v1.emit() + ", " + this.v2.emit() + ", " + this.v3.emit() + "), " + this.matId + ")";
}

Triangle.prototype.emit_decl = function() {
	return this.position.emit_decl() + this.v1.emit_decl() + this.v2.emit_decl() + this.v3.emit_decl();
}

Triangle.prototype.update_location = function(gl, program) {
	this.position.update_location(gl, program);
	this.v1.update_location(gl, program);
	this.v2.update_location(gl, program);
	this.v3.update_location(gl, program);
}

Triangle.prototype.upload_data = function(gl) {
	this.position.upload_data(gl);
	this.v1.upload_data(gl);
	this.v2.upload_data(gl);
	this.v3.upload_data(gl);
}

// Union

let Union = function (a, b) {
	this.a = a;
	this.b = b;
};

Union.prototype = new SceneNode();

Union.prototype.emit = function () {
	return "opU(" + this.a.emit() + ", " + this.b.emit() + ")";
};

Union.prototype.emit_decl = function () {
	return this.a.emit_decl() + this.b.emit_decl();
};

Union.prototype.update_location = function(gl, program) {
	this.a.update_location(gl, program);
	this.b.update_location(gl, program);
}

Union.prototype.upload_data = function(gl) {
	this.a.upload_data(gl);
	this.b.upload_data(gl);
}

// Intersection

let Intersection = function (a, b) {
	this.a = a;
	this.b = b;
};

Intersection.prototype.emit = function () {
	return "opIntersection(" + this.a.emit() + ", " + this.b.emit() + ")";
}

Intersection.prototype.emit_decl = function () {
	return this.a.emit_decl() + this.b.emit_decl();
};

Intersection.prototype.update_location = function(gl, program) {
	this.a.update_location(gl, program);
	this.b.update_location(gl, program);
}

Intersection.prototype.upload_data = function(gl) {
	this.a.upload_data(gl);
	this.b.upload_data(gl);
}

// Substraction

let Substraction = function (a, b) {
	this.a = a;
	this.b = b;
};

Substraction.prototype.emit = function () {
	return "opSubtract(" + this.a.emit() + ", " + this.b.emit() + ")";
}

Substraction.prototype.emit_decl = function () {
	return this.a.emit_decl() + this.b.emit_decl();
};

Substraction.prototype.update_location = function(gl, program) {
	this.a.update_location(gl, program);
	this.b.update_location(gl, program);
}

Substraction.prototype.upload_data = function(gl) {
	this.a.upload_data(gl);
	this.b.upload_data(gl);
}

// SmoothUnion

let SmoothUnion = function (a, b, k) {
	this.a = a;
	this.b = b;
	this.k = param_wrap(k, float_var_gen(0.8));
};

SmoothUnion.prototype = new SceneNode();

SmoothUnion.prototype.emit = function () {
	return "opSmoothUnion(" + this.a.emit() + ", " + this.b.emit() + ", " + this.k.emit() + ")";
};

SmoothUnion.prototype.emit_decl = function () {
	return this.a.emit_decl() + this.b.emit_decl() + this.k.emit_decl();
};

SmoothUnion.prototype.update_location = function(gl, program) {
	this.a.update_location(gl, program);
	this.b.update_location(gl, program);
	this.k.update_location(gl, program);
}

SmoothUnion.prototype.upload_data = function(gl) {
	this.a.upload_data(gl);
	this.b.upload_data(gl);
	this.k.upload_data(gl);
}

// exports

module.exports = {
	Vec2: Vec2,
	Vec3: Vec3,
	Vec4: Vec4,
	Var: Var,
	SceneNode: SceneNode,
	Sphere: Sphere,
	Box: Box,
	RoundBox: RoundBox,
	Torus: Torus,
	Capsule: Capsule,
	Plane: Plane,
	Cone: Cone,
	Cylinder: Cylinder,
	CappedCone: CappedCone,
	CappedCylinder: CappedCylinder,
	HexPrism: HexPrism,
	TriPrism: TriPrism,
	Quad: Quad,
	Triangle: Triangle,
	Union: Union,
	Intersection: Intersection,
	Substraction: Substraction,
	SmoothUnion: SmoothUnion
};
},{}]},{},[1]);
