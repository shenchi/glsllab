

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
};

Sphere.prototype = new SceneNode();

Sphere.prototype.emit = function () {
	return "sdSphere(p - " + this.center.emit() + ", " + this.radius.emit() + ")"; 
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
};

Box.prototype = new SceneNode();

Box.prototype.emit = function () {
	return "sdBox(p - " + this.center.emit() + ", " + this.size.emit() + ")";
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
};

RoundBox.prototype = new SceneNode();

RoundBox.prototype.emit = function () {
	return "udRoundBox(p - " + this.center.emit() + ", " + this.size.emit() + ", " + this.radius.emit() + ")";
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
};

Torus.prototype = new SceneNode();

Torus.prototype.emit = function () {
	return "sdTorus(p - " + this.center.emit() + ", " + this.radii.emit() + ")";
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
};

Capsule.prototype = new SceneNode();

Capsule.prototype.emit = function () {
	return "sdCapsule(p, " + this.start.emit() + ", " + this.end.emit() + ", " + this.radius.emit() + ")";
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
};

Plane.prototype = new SceneNode();

Plane.prototype.emit = function () {
	return "sdPlane(p, vec4(" + this.normal.emit() + ", " + this.distance.emit() + "))";
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
};

Cone.prototype = new SceneNode();

Cone.prototype.emit = function () {
	return "sdCone(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

Cylinder.prototype = new SceneNode();

Cylinder.prototype.emit = function () {
	return "sdCylinder(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

CappedCone.prototype = new SceneNode();

CappedCone.prototype.emit = function () {
	return "sdCappedCone(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

CappedCylinder.prototype = new SceneNode();

CappedCylinder.prototype.emit = function () {
	return "sdCappedCylinder(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

HexPrism.prototype = new SceneNode();

HexPrism.prototype.emit = function () {
	return "sdHexPrism(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

TriPrism.prototype = new SceneNode();

TriPrism.prototype.emit = function () {
	return "sdTriPrism(p - " + this.position.emit() + ", " + this.dimension.emit() + ")";
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
};

Quad.prototype = new SceneNode();

Quad.prototype.emit = function () {
	return "udQuad(p - " + this.position.emit() + ", " + this.v1.emit() + ", " + this.v2.emit() + ", " + this.v3.emit() + ", " + this.v4.emit() + ")";
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
};

Triangle.prototype = new SceneNode();

Triangle.prototype.emit = function () {
	return "udTriangle(p - " + this.position.emit() + ", " + this.v1.emit() + ", " + this.v2.emit() + ", " + this.v3.emit() + ")";
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
	this.k = param_wrap(k, float_var_gen(0.8));
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
	SmoothUnion: SmoothUnion
};