var Vector = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

var GRAVITY = -30;
var TESSELATION = 20;
var NUM_SUB_FIREWORKS = 15;
var EXPLOSIVITY = 20;
var MIN_AGE = -3; 

var gl = GL.create();
var mesh = GL.Mesh.sphere({"detail": TESSELATION});
var shader = new GL.Shader('\
  void main() {\
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
  }\
', '\
  void main() {\
	gl_FragColor = vec4(1.0, 0, 0, 1.0);\
  }\
');


var camera = new GL.Vector(5, 5, 5);

// Firework orb explodes when lifetime reaches zero
function FireworkOrb(initPos, initVel, initColor, initLifetime, shouldExplode, recurDepth) {
	// Store instance variables
	var pos = initPos;
	var vel = initVel;
	var color = initColor;
	var lifetime = initLifetime;
	var subFireworks = [];
	
	// Define public methods
	this.update = function(seconds) {
		
		// Update velocity based on acceleration
		vel.y += GRAVITY*seconds;
		
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
		gl.loadIdentity();
		gl.translate(pos.x, pos.y, pos.z);
		gl.translate(-camera.x, -camera.y, -camera.z);
		shader.draw(mesh);
		
		if (lifetime < 0) {
			// Draw each sub-firework
			for (var i = 0; i < subFireworks.length; i++) {
				subFireworks[i].draw(gl);
			}
		}
	};
	
	this.explode = function () {
		for (var i = 0; i < NUM_SUB_FIREWORKS; i++) {
		
			var phi = Math.random()*Math.PI*2;
			var theta = Math.random()*Math.PI;
		
			var newVel = new Vector(vel.x + EXPLOSIVITY*Math.cos(phi)*Math.sin(theta), vel.y + EXPLOSIVITY*Math.sin(phi)*Math.sin(theta), vel.z + EXPLOSIVITY*Math.cos(theta));
			var color = new Vector(1.0, 0, 0);
			
			var newLifetime = 2.0 + -1 + Math.random()*2; // explode after three seconds
			
			subFireworks.push(new FireworkOrb(new Vector(pos.x, pos.y, pos.z), newVel, color, newLifetime, true, recurDepth - 1));
		}

		shouldExplode = false;

	};
	
	
};

function init() {
	
	var fireworkOrbs = [];
		
	var pos = new Vector(0, -60, -300);
	var vel = new Vector(0, 100, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1; // explode after three seconds
	
	fireworkOrbs.push(new FireworkOrb(pos, vel, color, lifetime, true, 2));
	
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
		

		for (var i = 0; i < fireworkOrbs.length; i++) {
			fireworkOrbs[i].draw(gl);
		}
	

	};
	
	gl.fullscreen();
	gl.animate();

};



init();