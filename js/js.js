var FPS = 60;
var now, lastUpdate = (new Date)*1 - 1;
var fpsFilter = 50;

var Vector = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}

var GRAVITY = -40;
var TESSELATION = 20;
var NUM_SUB_FIREWORKS = 15;
var EXPLOSIVITY = 20;

// Firework orb explodes when lifetime reaches zero
function FireworkOrb(initPos, initVel, initColor, initLifetime, shouldExplode) {
	// Store instance variables
	var pos = initPos;
	var vel = initVel;
	var color = initColor;
	var lifetime = initLifetime;
	var mesh = GL.Mesh.sphere({"detail": TESSELATION});
	var shader = new GL.Shader('\
	  void main() {\
		gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
	  }\
	', '\
	  void main() {\
		gl_FragColor = vec4(' + color.x + ', ' + color.y + ', ' + color.z + ', 1.0);\
	  }\
	');
	var subFireworks = [];
	
	// Define public methods
	this.update = function() {
	
		if (lifetime > 0) {
			// Update velocity based on acceleration
			vel.y += GRAVITY/FPS;
			
			// Update position based on velocity
			pos.x += vel.x/FPS;
			pos.y += vel.y/FPS;
			pos.z += vel.z/FPS;
			
			// Check for explosion
			if (shouldExplode) {
				lifetime -= 1/FPS;
				if (lifetime <= 0) {
					this.explode();
				}
			}
		} else {
			// Update each sub-firework
			for (var i = 0; i < subFireworks.length; i++) {
				subFireworks[i].update();
			}
		}
	};
	
	this.draw = function(gl) {
		if (lifetime > 0) {
			gl.loadIdentity();
			gl.translate(pos.x, pos.y, pos.z);
			shader.draw(mesh);
		} else {
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
			
			var lifetime = 3.0; // explode after three seconds
			subFireworks.push(new FireworkOrb(new Vector(pos.x, pos.y, pos.z), newVel, color, lifetime, false));
		}

	};
	
	
};

function init() {
	
	var gl = GL.create();
	var fireworkOrbs = [];
		
	var pos = new Vector(0, -60, -300);
	var vel = new Vector(0, 100, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1.5; // explode after three seconds
	
	fireworkOrbs.push(new FireworkOrb(pos, vel, color, lifetime, true));
	
	gl.onupdate = function(seconds) {
	
		// Update FPS estimate
		var thisFrameFPS = 1000 / ((now=new Date) - lastUpdate);
		FPS += (thisFrameFPS - FPS) / fpsFilter;
		lastUpdate = now;
		
		for (var i = 0; i < fireworkOrbs.length; i++) {
			fireworkOrbs[i].update();
		}
	};

	gl.ondraw = function() {
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// Update display 
		var fpsOut = document.getElementById('fps');
		setInterval(function(){
		  fpsOut.innerHTML = FPS.toFixed(1) + " FPS";
		}, 1000);
		

		for (var i = 0; i < fireworkOrbs.length; i++) {
			fireworkOrbs[i].draw(gl);
		}
	

	};
	
	gl.fullscreen();
	gl.animate();

};



init();