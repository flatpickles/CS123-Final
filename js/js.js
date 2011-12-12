var Vector = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
	
	this.getArray = function () {
		return [this.x, this.y, this.z];
	};
}

var GRAVITY = -25;
var TESSELATION = 2;
var NUM_SUB_FIREWORKS = 100;
var EXPLOSIVITY = 45.0;
var MIN_AGE = -3; 
var AIR_RESISTANCE = 0.020;
var INITIAL_SPEED = 600;
var RECUR_DEPTH = 2;

var gl = GL.create();
var sphereMesh = GL.Mesh.sphere({"detail": TESSELATION});
var sphereShader = new GL.Shader('sphereVert', 'sphereFrag');

var planeMesh = GL.Mesh.plane({ coords: true });
var planeShader = new GL.Shader('planeVert', 'planeFrag');

var camera = new GL.Vector(0, 150, 500);

// Global dicts and arrays
var fireworkPropertiesDict = {};
fireworkPropertiesDict.positions = {};
fireworkPropertiesDict.colors = {};
var positionsBuffer = [];
var colorsBuffer = [];

function updateBuffers() {
	positionsBuffer = [];
	colorsBuffer = [];
	
	for (var key in fireworkPropertiesDict.positions) {
		positionsBuffer.push(fireworkPropertiesDict.positions[key].getArray());	
	}
	
	for (var key in fireworkPropertiesDict.colors) {
		colorsBuffer.push(fireworkPropertiesDict.colors[key].getArray());	
	}
}

// A monotonically increasing number for the lifetime of the program
var fireworkCounter = 0;

// A list of all the points to be drawn. For points A, B: [ax, ay, az, bx, by, bz]
//var pointDict = {"vertices": [[2,3,4], [1,2,3]]};
var pointsMesh = new GL.Mesh();
pointsMesh.addVertexBuffer('colors', 'gl_Color');
var meshShader = new GL.Shader('listVert', 'listFrag');

// Firework orb explodes when lifetime reaches zero
function Firework(initPos, initVel, initColor, initLifetime, shouldExplode, recurDepth) {
	// Calculate an ID used to index into fireworkPropertiesDict
	var id = "index" + fireworkCounter++;
	// Store instance variables
	var pos = initPos;
	var vel = initVel;
	var color = initColor;
	// Store color in fireworkPropertiesDict
	fireworkPropertiesDict.colors[id] = color;
	fireworkPropertiesDict.positions[id] = pos;
	var lifetime = initLifetime;
	var subFireworks = [];
	var hasExploded = false;
	
	var airResistance = AIR_RESISTANCE/(recurDepth + 1);
	// Define public methods
	this.update = function(seconds) {
		
		// Update velocity based on acceleration
		if (vel.x > 0)
			vel.x -= seconds*(airResistance*vel.x*vel.x);
		else
			vel.x += seconds*(airResistance*vel.x*vel.x);
			
		if (vel.y > 0)
			vel.y -= seconds*(airResistance*vel.y*vel.y);
		else
			vel.y += seconds*(airResistance*vel.y*vel.y);
		vel.y += seconds*(GRAVITY);
			
		if (vel.z > 0)
			vel.z -= seconds*(airResistance*vel.z*vel.z);
		else
			vel.z += seconds*(airResistance*vel.z*vel.z);
		
		// Update position based on velocity
		pos.x += vel.x*seconds;
		pos.y += vel.y*seconds;
		pos.z += vel.z*seconds;
		
		if (!hasExploded) {
			fireworkPropertiesDict.positions[id] = pos;
		}
		
		if (lifetime >= 0) {

			lifetime -= seconds; // some decimal
					
			// Check for explosion
			if (shouldExplode && recurDepth > 0) {
				if (lifetime <= 0) {
					this.explode();
				}
			}
			
			return false;
		} else {
			lifetime -= seconds; // some decimal
			
			if (lifetime < MIN_AGE && !!fireworkPropertiesDict.positions[id]) {
				delete fireworkPropertiesDict.positions[id];
				delete fireworkPropertiesDict.colors[id];
			}
			
			var finished = true;
			var newList = [];
			// Update each sub-firework
			for (var i = 0; i < subFireworks.length; i++) {
				if (!subFireworks[i].update(seconds)) {
					finished = false;
					newList.push(subFireworks[i]);
				}	
			}
			subFireworks = newList; // with finished fireworks removed
			
			finished = finished && lifetime < MIN_AGE;
			return finished;
		}
	};
	
	/*
	this.draw = function(gl) {
		// Draw itself
		if (!hasExploded) {
			gl.loadIdentity();
			gl.translate(pos.x, pos.y, pos.z);
			doCameraTransformation(gl);
			sphereShader.uniforms({
				color: [color.x, color.y, color.z]
			}).draw(sphereMesh);
		}
		
		if (lifetime < 0) {
			// Draw each sub-firework
			for (var i = 0; i < subFireworks.length; i++) {
				subFireworks[i].draw(gl);
			}
		}
	};
	*/
	
	this.explode = function () {
		var newColor = new Vector(Math.random(), Math.random(), Math.random());
		for (var i = 0; i < NUM_SUB_FIREWORKS; i++) {
		
			var phi = Math.random()*Math.PI*2;
			var theta = Math.random()*Math.PI;
			
			var explosionCoeff = EXPLOSIVITY*recurDepth;
		
			var newVel = new Vector(vel.x + explosionCoeff*Math.cos(phi)*Math.sin(theta), vel.y + explosionCoeff*Math.sin(phi)*Math.sin(theta), vel.z + explosionCoeff*Math.cos(theta));
			
			var newLifetime = 1.5 + -0.5 + Math.random()*1; // explode after three seconds
			
			subFireworks.push(new Firework(new Vector(pos.x, pos.y, pos.z), newVel, newColor, newLifetime, true, recurDepth - 1));
		}
		
		
		delete fireworkPropertiesDict.positions[id];
		delete fireworkPropertiesDict.colors[id];
		
		//shouldExplode = false;
		hasExploded = true;

	};
	
	
};

function init() {
	
	var fireworks = [];
		
	var pos = new Vector(0, 0, 0);
	var vel = new Vector(0, INITIAL_SPEED, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1; // explode after three seconds
	
	console.log(RECUR_DEPTH);
	
	fireworks.push(new Firework(pos, vel, color, lifetime, false, RECUR_DEPTH));
	
	var angleX = -0;
	var angleY = 0;

	gl.onupdate = function(seconds) {
		var speed = seconds*400;
		
		var newFireworks = [];
		for (var i = 0; i < fireworks.length; i++) {
			// Update the firework and keep it if it's not done
			if (!fireworks[i].update(seconds)) {
				newFireworks.push(fireworks[i]);
			}
		}
		fireworks = newFireworks;
		
		// Forward movement
		var up = GL.keys.W | GL.keys.UP;
		var down = GL.keys.S | GL.keys.DOWN;
		var forward = GL.Vector.fromAngles((90 - angleY) * Math.PI / 180, (180 - angleX) * Math.PI / 180);
		camera = camera.add(forward.multiply(speed * (up - down)));

		// Sideways movement
		var left = GL.keys.A | GL.keys.LEFT;
		var right = GL.keys.D | GL.keys.RIGHT;
		var sideways = GL.Vector.fromAngles(-angleY * Math.PI / 180, 0);
		camera = camera.add(sideways.multiply(speed * (right - left)));
		
		updateBuffers();
	};

	gl.ondraw = function() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		
		//gl.color(0, 1, 0, 1);
		
		/*
		for (var i = 0; i < fireworks.length; i++) {
			fireworks[i].draw(gl);
		}
		
		gl.loadIdentity();
		
		*/
		
		
		doCameraTransformation(gl);
		gl.scale(1000, 1, 1000);
		gl.rotate(90, 1, 0, 0); // rotate around x-axis so that it lays on the XZ plane
		
		planeShader.draw(planeMesh);
		
		gl.loadIdentity();
		doCameraTransformation(gl);
	//	gl.drawArrays(gl.POINTS, 0, points.length/3);
		//meshShader.draw(pointsMesh); 
		
		if (positionsBuffer.length != colorsBuffer.length)
			alert("something went horribly wrong.\n\nposBuffer: " + positionsBuffer.length + " and colorsBuffer: " + colorsBuffer.length);
			
		pointsMesh.vertices = positionsBuffer;
		pointsMesh.colors = colorsBuffer;
		pointsMesh.compile();
		//console.log(pointsMesh);
		//pointsMesh.compile();
		meshShader.drawBuffers(pointsMesh.vertexBuffers, null, gl.POINTS);

	};
	
	gl.onmousedown = function(e) {
		//console.log(e);
		var tracer = new GL.Raytracer();
		var ray = tracer.getRayForPixel(e.x, e.y);
		result = GL.Raytracer.hitTestBox(tracer.eye, ray, new GL.Vector(-1000, -1000, camera.z - 500), new GL.Vector(1000, 1000, camera.z - 501));
		console.log(result);
		fireworks.push(new Firework(new Vector(result.hit.x, result.hit.y, result.hit.z), new Vector(0, 0, 0), new Vector(1.0, 0, 0), 0, true, 1));
	};
	
	
	
	gl.fullscreen();
	gl.animate();
	//console.log(pointsMesh);

};

function doCameraTransformation(gl) {
	gl.translate(-camera.x, -camera.y, -camera.z);
};



init();