

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
	this.center = c;
	if (r instanceof Var)
		this.radius = r;
	else
		this.radius = new Float(r);
};

Sphere.prototype = new SceneNode();

Sphere.prototype.emit = function () {
	return "length(p - " + this.center.emit() + ") - " + this.radius.emit(); 
};

Sphere.prototype.emit_decl = function() {
	return this.center.emit_decl() + this.radius.emit_decl();
}

Sphere.prototype.update_location = function(gl, program) {
	if (this.center instanceof Var) this.center.update_location(gl, program);
	if (this.radius instanceof Var) this.radius.update_location(gl, program);
}

Sphere.prototype.upload_data = function(gl) {
	if (this.center instanceof Var) this.center.upload_data(gl);
	if (this.radius instanceof Var) this.radius.upload_data(gl);
}

// Box

let Box = function (c, s) {
	this.center = c;
	this.size =  s;
};

Box.prototype = new SceneNode();

Box.prototype.emit = function () {
	return "length(max(abs(p - " + this.center.emit() + ") - " + this.size.emit() + ", 0.0))";
}

// Union

let Union = function (a, b) {
	this.a = a;
	this.b = b;
};

Union.prototype = new SceneNode();

Union.prototype.emit = function () {
	return "min(" + this.a.emit() + ", " + this.b.emit() + ")";
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

// SmoothUnion

let SmoothUnion = function (a, b, k) {
	this.a = a;
	this.b = b;
	if (k instanceof Var)
		this.k = k;
	else
		this.k = new Float(k || 0.8);
};

SmoothUnion.prototype = new SceneNode();

SmoothUnion.prototype.emit = function () {
	return "smin(" + this.a.emit() + ", " + this.b.emit() + ", " + this.k.emit() + ")";
};

SmoothUnion.prototype.emit_decl = function () {
	return this.a.emit_decl() + this.b.emit_decl() + this.k.emit_decl();
};

SmoothUnion.prototype.update_location = function(gl, program) {
	this.a.update_location(gl, program);
	this.b.update_location(gl, program);
	if (this.k instanceof Var) this.k.update_location(gl, program);
}

SmoothUnion.prototype.upload_data = function(gl) {
	this.a.upload_data(gl);
	this.b.upload_data(gl);
	if (this.k instanceof Var) this.k.upload_data(gl);
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
	Union: Union,
	SmoothUnion: SmoothUnion
};