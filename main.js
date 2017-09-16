
(function()
{

	let glsl = require("glslify");

	let label = document.getElementById("label");

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

	let fs_source = glsl`
		precision highp float;
		varying vec2 v_uv;

		uniform float time;
		uniform vec3 constants; // (canvas_width, canvas_height, 0, 0)

		vec2 scene(vec3 p);

		#pragma glslify: raytrace = require('glsl-raytrace', map = scene, steps = 90)
		#pragma glslify: normal = require('glsl-sdf-normal', map = scene)
		#pragma glslify: camera = require("glsl-camera-ray")
		#pragma glslify: noise = require('glsl-noise/simplex/4d')

		vec2 scene(vec3 p)
		{
			float r  = 1.0 + noise(vec4(p, time)) * 0.25;
			float d  = length(p) - r;
			float id = 0.0;

			return vec2(d, id);
		}

		void main(void)
		{
			vec2 pos = v_uv * 2.0 - 1.0;
			pos.x *= (constants.x / constants.y);
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


	let program = create_program(vs_source, fs_source);
	gl.useProgram(program);

	let loc_a_pos = gl.getAttribLocation(program, "a_pos");
	let loc_a_uv = gl.getAttribLocation(program, "a_uv");

	let loc_u_time = gl.getUniformLocation(program, "time");
	let loc_u_constants = gl.getUniformLocation(program, "constants");

	gl.enableVertexAttribArray(loc_a_pos);
	gl.enableVertexAttribArray(loc_a_uv);

	gl.vertexAttribPointer(loc_a_pos, 3, gl.FLOAT, false, 20, 0);
	gl.vertexAttribPointer(loc_a_uv, 2, gl.FLOAT, false, 20, 12);

	gl.uniform3f(loc_u_constants, canvas.width, canvas.height, 0);

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

