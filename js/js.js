var Vector = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

var GRAVITY = -25;
var TESSELATION = 2;
var NUM_SUB_FIREWORKS = 20;
var EXPLOSIVITY = 35.0;
var MIN_AGE = -3; 
var AIR_RESISTANCE = 0.020;
var INITIAL_SPEED = 600;
var RECUR_DEPTH = 2;

var gl = GL.create();
var sphereMesh = GL.Mesh.sphere({"detail": TESSELATION});
var sphereShader = new GL.Shader('\
	void main() {\
		gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
	}\
', '\
	uniform vec3 color;\
	void main() {\
		gl_FragColor = vec4(color.xyz, 1.0);\
	}\
');

var planeMesh = GL.Mesh.plane({ coords: true });
var planeShader = new GL.Shader('\
  varying vec2 coord;\
  void main() {\
    coord = gl_TexCoord.xy;\
    gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
  }\
', '\
  uniform sampler2D texture;\
  uniform sampler2D overlay;\
  varying vec2 coord;\
  void main() {\
    gl_FragColor = vec4(0, 0.6, 0.1, 1.0);\
  }\
');


var camera = new GL.Vector(0, 150, 500);

// Firework orb explodes when lifetime reaches zero
function FireworkOrb(initPos, initVel, initColor, initLifetime, shouldExplode, recurDepth) {
	// Store instance variables
	var pos = initPos;
	var vel = initVel;
	var color = initColor;
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
			
		if (lifetime > 0) {

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
	
	this.explode = function () {
		var newColor = new Vector(Math.random(), Math.random(), Math.random());
		for (var i = 0; i < NUM_SUB_FIREWORKS; i++) {
		
			var phi = Math.random()*Math.PI*2;
			var theta = Math.random()*Math.PI;
			
			var explosionCoeff = EXPLOSIVITY*recurDepth;
		
			var newVel = new Vector(vel.x + explosionCoeff*Math.cos(phi)*Math.sin(theta), vel.y + explosionCoeff*Math.sin(phi)*Math.sin(theta), vel.z + explosionCoeff*Math.cos(theta));
			
			var newLifetime = 1.5 + -0.5 + Math.random()*1; // explode after three seconds
			
			subFireworks.push(new FireworkOrb(new Vector(pos.x, pos.y, pos.z), newVel, newColor, newLifetime, true, recurDepth - 1));
		}

		//shouldExplode = false;
		hasExploded = true;

	};
	
	
};

function init() {
	
	var fireworkOrbs = [];
		
	var pos = new Vector(0, 0, 0);
	var vel = new Vector(0, INITIAL_SPEED, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1; // explode after three seconds
	
	console.log(RECUR_DEPTH);
	
	fireworkOrbs.push(new FireworkOrb(pos, vel, color, lifetime, true, RECUR_DEPTH));
	
	var angleX = -0;
	var angleY = 0;

	gl.onupdate = function(seconds) {
		var speed = seconds*400;
		
		var newFireworks = [];
		for (var i = 0; i < fireworkOrbs.length; i++) {
			// Update the firework and keep it if it's not done
			if (!fireworkOrbs[i].update(seconds)) {
				newFireworks.push(fireworkOrbs[i]);
			}
		}
		fireworkOrbs = newFireworks;
		
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
	};

	gl.ondraw = function() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		
		gl.color(0, 1, 0, 1);

		for (var i = 0; i < fireworkOrbs.length; i++) {
			fireworkOrbs[i].draw(gl);
		}
	
		gl.loadIdentity();
		
		
		
		
		doCameraTransformation(gl);
		gl.scale(1000, 1, 1000);
		gl.rotate(90, 1, 0, 0); // rotate around x-axis so that it lays on the XZ plane
		
		planeShader.draw(planeMesh);

	};
	
	gl.fullscreen();
	gl.animate();

};

function doCameraTransformation(gl) {
	gl.translate(-camera.x, -camera.y, -camera.z);
};



init();