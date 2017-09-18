

function emit_float(a) {
	if (a % 1 === 0)
		return a.toFixed(1);
	else
		return a;
}

var Vec3 = function (x, y, z) {
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

var SceneNode = function () {}

SceneNode.prototype = {
	emit: function() { return "#NotImplemented#"; }
};


var Sphere = function (c, r) {
	this.center = c;
	this.radius = r;
};

Sphere.prototype = new SceneNode();

Sphere.prototype.emit = function () {
	return "length(p - " + this.center.emit() + ") - " + emit_float(this.radius); 
};

var Box = function (c, s) {
	this.center = c;
	this.size =  s;
};

Box.prototype = new SceneNode();

Box.prototype.emit = function () {
	return "length(max(abs(p - " + this.center.emit() + ") - " + this.size.emit() + ", 0.0))";
}

var Union = function (a, b) {
	this.a = a;
	this.b = b;
};

Union.prototype = new SceneNode();

Union.prototype.emit = function () {
	return "min(" + this.a.emit() + ", " + this.b.emit() + ")";
};

var SmoothUnion = function (a, b, k) {
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