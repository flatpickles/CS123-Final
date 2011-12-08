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
var NUM_SUB_FIREWORKS = 5;
var EXPLOSIVITY = 0.1;

// Firework orb explodes when lifetime reaches zero
function FireworkOrb(initPos, initVel, initColor, initLifetime, shouldExplode) {
	// Store instance variables
	this.pos = initPos;
	this.vel = initVel;
	this.color = initColor;
	this.lifetime = initLifetime;
	this.mesh = GL.Mesh.sphere({"detail": TESSELATION});
	this.shader = new GL.Shader('\
	  void main() {\
		gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
	  }\
	', '\
	  void main() {\
		gl_FragColor = vec4(' + this.color.x + ', ' + this.color.y + ', ' + this.color.z + ', 1.0);\
	  }\
	');
	this.shouldExplode = shouldExplode;
	this.subFireworks = []
	
	// Define public methods
	this.update = function() {
	
		if (this.lifetime > 0) {
			// Update velocity based on acceleration
			this.vel.y += GRAVITY/FPS;
			
			// Update position based on velocity
			this.pos.x += this.vel.x/FPS;
			this.pos.y += this.vel.y/FPS;
			this.pos.z += this.vel.z/FPS;
			
			// Check for explosion
			if (this.shouldExplode) {
				this.lifetime -= 1/FPS;
				if (this.lifetime <= 0) {
					this.explode();
				}
			}
		} else {
			// Update each sub-firework
			for (var i = 0; i < this.subFireworks.length; i++) {
				this.subFireworks[i].update();
			}
		}
	};
	
	this.draw = function(gl) {
		if (this.lifetime > 0) {
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.loadIdentity();
			gl.translate(this.pos.x, this.pos.y, this.pos.z);
			this.shader.draw(this.mesh);
		} else {
			// Draw each sub-firework
			for (var i = 0; i < this.subFireworks.length; i++) {
				this.subFireworks[i].draw(gl);
			}
		}
	};
	
	this.explode = function () {
		console.log("EXPLODED!");
		for (var i = 0; i < NUM_SUB_FIREWORKS; i++) {
		
			var phi = Math.random()*Math.PI*2;
			var theta = Math.random()*Math.PI;
		
		
			var vel = new Vector(this.vel.x + EXPLOSIVITY*Math.cos(phi)*Math.sin(theta), this.vel.y + EXPLOSIVITY*Math.sin(phi)*Math.sin(theta), this.vel.z + EXPLOSIVITY*Math.cos(theta));
			console.log(vel);
			var color = new Vector(1.0, 0, 0);
			
			var lifetime = 3.0; // explode after three seconds
			this.subFireworks.push(new FireworkOrb(this.pos, vel, color, lifetime, false));
		}
	};
	
	
};

function init() {
	
	var gl = GL.create();
	var fireworkOrbs = [];
		
	var pos = new Vector(0, -60, -300);
	var vel = new Vector(0, 120, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 3.0; // explode after three seconds
	
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