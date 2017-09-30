
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
	let obj2 = new objs.Capsule(new objs.Vec3(1, 0, 0), new objs.Vec3(1, 1, 0));

	let scene = new objs.SmoothUnion(obj1, obj2);

	let fs_source = glsl`
		precision highp float;
		varying vec2 v_uv;

		uniform float time;
		uniform vec2 resolution;

		${ scene.emit_decl() }

		vec2 scene(vec3 p);

		#pragma glslify: raytrace = require('glsl-raytrace', map = scene, steps = 90)
		#pragma glslify: normal = require('glsl-sdf-normal', map = scene)
		#pragma glslify: camera = require("glsl-camera-ray")
		#pragma glslify: noise = require('glsl-noise/simplex/4d')
		#pragma glslify: smin = require('glsl-smooth-min')

		// PRIMITIVES
		#pragma glslify: sdPlane	= require('glsl-sdf-primitives/sdPlane')
		#pragma glslify: sdBox		= require('glsl-sdf-primitives/sdBox')
		#pragma glslify: udRoundBox = require('glsl-sdf-primitives/udRoundBox'	)
		#pragma glslify: sdTorus 	= require('glsl-sdf-primitives/sdTorus')
		#pragma glslify: sdCapsule	= require('glsl-sdf-primitives/sdCapsule')
		#pragma glslify: sdTriPrism = require('glsl-sdf-primitives/sdTriPrism')
		#pragma glslify: sdHexPrism	= require('glsl-sdf-primitives/sdHexPrism')
		#pragma glslify: sdSphere	= require('glsl-sdf-primitives/sdSphere')
		#pragma glslify: udTriangle	= require('glsl-sdf-primitives/udTriangle')
		#pragma glslify: sdCone		= require('glsl-sdf-primitives/sdCappedCone')
		#pragma glslify: sdCylinder	= require('glsl-sdf-primitives/sdCappedCylinder')

		vec2 scene(vec3 p)
		{
			return vec2(${ scene.emit() }, 0.0);
		}

		void main(void)
		{
			vec2 pos = v_uv * 2.0 - 1.0;
			pos.x *= (resolution.x / resolution.y);
			vec3 color = vec3(0.0);
			vec3 ro = vec3(0, 0, 4);
			vec3 rd = camera(ro, vec3(0, 0, 0), pos, 2.0);

			vec2 t = raytrace(ro, rd);
			if (t.x > -0.5)
			{
				vec3 pos = ro + rd * t.x;
				vec3 nor = normal(pos);

				color = nor * 0.5 + 0.5;
			}

			gl_FragColor = vec4(color, 1.0);
		}
	`;

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

	let total_time = 0.0;

	function render(timestamp)
	{
		total_time = timestamp / 1000.0;

		if (label) label.innerHTML = "Time: " + total_time;

		gl.uniform1f(loc_u_time, total_time);

		obj1.center.set(new objs.Vec3(-1 + 0.5 * Math.sin(total_time), 0, 0));
		obj2.radius.set(0.2 + 0.1 * Math.sin(total_time));

		scene.upload_data(gl);

		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

		window.requestAnimationFrame(render);
	}

	render(0.0);
})();

