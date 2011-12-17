var Vector = function(x, y, z, a) {
	this.x = x;
	this.y = y;
	this.z = z;
	this.a = a;
	if (a == undefined) this.a = 1.0;
	
	this.getArray = function () {
		return [this.x, this.y, this.z];
	};
	
	this.getArray4 = function() {
		return [this.x, this.y, this.z, this.a];
	}
}

var GRAVITY = -25;
var TESSELATION = 2;
var NUM_SUB_FIREWORKS = 30;
var EXPLOSIVITY = 45.0;
var MIN_AGE = -10; 
var AIR_RESISTANCE = 0.020;
var INITIAL_SPEED = 600;
var RECUR_DEPTH = 2;
var PLANE_WORLD_SIZE = 1500;

var gl = GL.create();
var trailsMesh = new GL.Mesh();
var trailsShader = new GL.Shader('lineVert', 'lineFrag');

var planeMesh = GL.Mesh.plane({ coords: true });
var planeShader = new GL.Shader('planeVert', 'planeFrag');

//var reflectionMesh = GL.Mesh.plane({ coords: true });
//var reflectionTexture = GL.Texture(

var camera = new GL.Vector(0, 700, 900);
var angleX = -30;
var angleY = 0;

// Global dicts and arrays
var positionsBuffer = [];
var colorsBuffer = [];
var trailsBuffer = [];

// Water texture
var waterTexture = GL.Texture.fromURL('textures/water.jpg');


var colorVectors = [
	new Vector(255, 100, 0),
	new Vector(255, 0, 0),
	new Vector(255, 42, 42), 
	new Vector(255, 94, 0), 
	new Vector(255, 183, 0), 
	new Vector(247, 255, 0), 
	new Vector(106, 255, 0), 
	new Vector(255, 200, 0), 
	new Vector(0, 136, 255), 
	new Vector(250, 0, 255), 
	new Vector(255, 0, 128), 
	new Vector(198, 255, 213), 
	new Vector(198, 246, 255), 
	new Vector(255, 198, 240),
	new Vector(52, 72, 141), 
	new Vector(219, 102, 120), 
	new Vector(0, 72, 255), 
	new Vector(253, 165, 68), 
	new Vector(255, 71, 131), 
	new Vector(245, 129, 44), 
	new Vector(181, 255, 169), 
	new Vector(0, 255, 0), 
	new Vector(255, 255, 0), 
	new Vector(255, 0, 0), 
	new Vector(0, 0, 255), 
	new Vector(0, 255, 255), 
];

var brightnessBoom = 0;
var flipped = false;

// A list of all the points to be drawn. For points A, B: [ax, ay, az, bx, by, bz]
//var pointDict = {"vertices": [[2,3,4], [1,2,3]]};
var pointsMesh = new GL.Mesh();
pointsMesh.addVertexBuffer('colors', 'gl_Color');
var meshShader = new GL.Shader('pointVert', 'pointFrag');

var terrain = new TerrainGrid(3000, 3000, 100);
var terrainShader = new GL.Shader('terrainVert', 'terrainFrag');

// Firework orb explodes when lifetime reaches zero
function Firework(initPos, initVel, initColor, initLifetime, shouldExplode, recurDepth, hideTrail) {
	// Store instance variables
	var pos = new Vector(initPos.x, initPos.y, initPos.z);
	var vel = initVel;
	var color = initColor;
	var lifetime = initLifetime;
	var subFireworks = [];
	var hasExploded = false;
	var trailToStart = true;
	
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

			
		
		if (!hasExploded && lifetime >= MIN_AGE && pos.y > 0) {

			var speedThreshold = 10;
			if ((vel.x > speedThreshold || vel.y > speedThreshold || vel.z > speedThreshold) && !hideTrail) {

				var prevPos = new Vector(pos.x, pos.y, pos.z);
				prevPos.x -= (vel.x > 0) ? vel.x*vel.x*0.002 : vel.x*vel.x*0.002*-1;
				prevPos.y -= (vel.y > 0) ? vel.y*vel.y*0.002 : vel.y*vel.y*0.002*-1;
				prevPos.z -= (vel.z > 0) ? vel.z*vel.z*0.002 : vel.z*vel.z*0.002*-1;
				
				var lengthToPrev = Math.sqrt((prevPos.x - pos.x)*(prevPos.x - pos.x) + (prevPos.y - pos.y)*(prevPos.y - pos.y) - (prevPos.z - pos.z)*(prevPos.z - pos.z));
				var lengthToInit = Math.sqrt((initPos.x - pos.x)*(initPos.x - pos.x) + (initPos.y - pos.y)*(initPos.y - pos.y) - (initPos.z - pos.z)*(initPos.z - pos.z));
				
				var firstPoint, secondPoint;
				
				if (trailToStart && (lengthToPrev > lengthToInit)) {
					firstPoint = new Vector(initPos.x, initPos.y, initPos.z);
					secondPoint = new Vector(pos.x, pos.y, pos.z);
				} else {
					// Add previous to trail
					firstPoint = prevPos;
					secondPoint = new Vector(pos.x, pos.y, pos.z);
					trailToStart = false;
				}
				
				
				trailsBuffer.push(firstPoint.getArray());
				trailsBuffer.push(secondPoint.getArray());
				firstPoint.y = -firstPoint.y;
				secondPoint.y = -secondPoint.y;
				//trailsBuffer.push(firstPoint.getArray());
				//trailsBuffer.push(secondPoint.getArray());
				
			}
		
			// Add to buffers
			positionsBuffer.push(pos.getArray());
			var flippedPos = pos.getArray();
			flippedPos[1] = -flippedPos[1];
			//positionsBuffer.push(flippedPos);
				
			//colorsBuffer.push(color.getArray());
			colorsBuffer.push(color.getArray());
			
			
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
	
	this.explode = function () {
		brightnessBoom = 15;
		var newColor = new Vector(Math.random()*.95 + .05, Math.random()*.95 + .05, Math.random()*.95 + .05);
		for (var i = 0; i < NUM_SUB_FIREWORKS; i++) {
		
			var phi = Math.random()*Math.PI*2;
			var theta = Math.random()*Math.PI;
			
			var explosionCoeff = EXPLOSIVITY*recurDepth;
		
			var newVel = new Vector(vel.x + explosionCoeff*Math.cos(phi)*Math.sin(theta), vel.y + explosionCoeff*Math.sin(phi)*Math.sin(theta), vel.z + explosionCoeff*Math.cos(theta));
			
			var newLifetime = 1.5 + -0.5 + Math.random()*1; // explode after three seconds
			
			subFireworks.push(new Firework(new Vector(pos.x, pos.y, pos.z), newVel, newColor, newLifetime, true, recurDepth - 1));
		}
		
		hasExploded = true;

	};
	
	
};

function init() {
	
	var fireworks = [];
		
	var pos = new Vector(0, 0, 0);
	var vel = new Vector(0, INITIAL_SPEED, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1; // explode after three seconds
	
	setTimeout(function() {fireworks.push(new Firework(pos, vel, color, lifetime, true, RECUR_DEPTH, true))}, 2000);

	gl.onupdate = function(seconds) {
		// Clear buffers to be recomputed
		positionsBuffer = [];
		colorsBuffer = [];
		trailsBuffer = [];
		
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
		
	};

	gl.ondraw = function() {
		//flipped = false;
		finalDraw();
		//flipped = true;
		//drawOnce();
	};
	
	gl.onmousedown = function(e) {
		var tracer = new GL.Raytracer();
		var ray = tracer.getRayForPixel(e.x, e.y);
		result = GL.Raytracer.hitTestBox(tracer.eye, ray, new GL.Vector(-1000, -1000, camera.z - 500), new GL.Vector(1000, 1000, camera.z - 501));
		//fireworks.push(new Firework(new Vector(result.hit.x, result.hit.y, -200), new Vector(0, 0, 0), new Vector(1.0, 0, 0), 1, false, 1)); // wont work because not rotated
		//fireworks.push(new Firework(new Vector(-50, 250, 500), new Vector(0, 100, 0), new Vector(1.0, 0, 0), 0, true, 1));
	};
	
	gl.onmousemove = function(e) {
		if (e.dragging) {
			angleY -= e.deltaX * 0.25;
			angleX = Math.max(-90, Math.min(90, angleX - e.deltaY * 0.25));
			//fireworks.push(new Firework(new Vector(0, 500, 500), new Vector(0, 300, 0), new Vector(1.0, 0, 0), 0, true, 1));
		}  
	};
	
	function drawOnce() {
		gl.enable(gl.CULL_FACE);
		if (flipped)
			gl.cullFace(gl.FRONT);
		else
			gl.cullFace(gl.BACK);
		
		// Necessary to properly do reflections in water
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		// Set brightness of the screen depending on whether or not a firework
		// recently exploded or not
		/*if (brightnessBoom > 1) {
			gl.clearColor(0.02*brightnessBoom, 0.02*brightnessBoom, 0.02*brightnessBoom, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			brightnessBoom--;
		} else if (brightnessBoom == 0) {
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}	*/
		
		
		
		// Do a camera transformation before painting everything
		doCameraTransformation(gl);
		
		if (positionsBuffer.length != colorsBuffer.length)
			alert("something went horribly wrong.\n\nposBuffer: " + positionsBuffer.length + " and colorsBuffer: " + colorsBuffer.length);
			
		// Set up the mesh and draw it based on the buffers
		pointsMesh.vertices = positionsBuffer;
		pointsMesh.colors = colorsBuffer;
		pointsMesh.compile();
		meshShader.drawBuffers(pointsMesh.vertexBuffers, null, gl.POINTS);
		
		// Draw the trails 
		trailsMesh.vertices = trailsBuffer;
		trailsMesh.compile();
		trailsShader.drawBuffers(trailsMesh.vertexBuffers, null, gl.LINES);

		
		
		// Rotate before drawing the plane
		gl.scale(PLANE_WORLD_SIZE, 1.0, PLANE_WORLD_SIZE);
		gl.rotate(-90, 1, 0, 0); // rotate around x-axis so that it lays on the XZ plane
		
		// Draw the water texture
		/*waterTexture.bind(0);
		planeShader.uniforms({
			texture: 0, 
			tiling: 12
		}).draw(planeMesh);
		waterTexture.unbind(0);*/
		
		// Draw terrain
		doCameraTransformation(gl);
		terrain.drawWithShader(terrainShader);
		
	};
	
	
	function finalDraw() {
		//gl.clearColor(0.0, 0.0, 0.0, 0.0);
		//gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		//gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		
		//if (flipped)
		//	gl.cullFace(gl.FRONT);
		//else
		
		
		
		// Necessary to properly do reflections in water		
		// Set brightness of the screen depending on whether or not a firework
		// recently exploded or not
		/*if (brightnessBoom > 1) {
			gl.clearColor(0.02*brightnessBoom, 0.02*brightnessBoom, 0.02*brightnessBoom, 1.0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			brightnessBoom--;
		} else if (brightnessBoom == 0) {
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}	*/
		
		

		
		
		
		gl.disable(gl.DEPTH_TEST);
		gl.cullFace(gl.FRONT);
		doCameraTransformation(gl, true);
		terrain.drawWithShader(terrainShader);
		
		// Draw reflected fireworks and trails
		gl.enable(gl.DEPTH_TEST);
		gl.cullFace(gl.FRONT);
		doCameraTransformation(gl, true);
		
		// Set up the mesh and draw it based on the buffers
		pointsMesh.vertices = positionsBuffer;
		pointsMesh.colors = colorsBuffer;
		pointsMesh.compile();
		meshShader.drawBuffers(pointsMesh.vertexBuffers, null, gl.POINTS);
		
		// Draw the trails 
		trailsMesh.vertices = trailsBuffer;
		trailsMesh.compile();
		trailsShader.drawBuffers(trailsMesh.vertexBuffers, null, gl.LINES);
		
		
		//Draw real fireworks/trails
		// Do a camera transformation before painting everything
		gl.enable(gl.DEPTH_TEST);
		gl.cullFace(gl.BACK);
		doCameraTransformation(gl, false);
		
		if (positionsBuffer.length != colorsBuffer.length)
			alert("something went horribly wrong.\n\nposBuffer: " + positionsBuffer.length + " and colorsBuffer: " + colorsBuffer.length);
			
		// Set up the mesh and draw it based on the buffers
		pointsMesh.vertices = positionsBuffer;
		pointsMesh.colors = colorsBuffer;
		pointsMesh.compile();
		meshShader.drawBuffers(pointsMesh.vertexBuffers, null, gl.POINTS);
		
		// Draw the trails 
		trailsMesh.vertices = trailsBuffer;
		trailsMesh.compile();
		trailsShader.drawBuffers(trailsMesh.vertexBuffers, null, gl.LINES);
		
		
		
		// Rotate before drawing the plane
		gl.cullFace(gl.BACK);
		doCameraTransformation(gl, false);
		gl.scale(PLANE_WORLD_SIZE, 1.0, PLANE_WORLD_SIZE);
		gl.rotate(-90, 1, 0, 0); // rotate around x-axis so that it lays on the XZ plane
			
		
		gl.enable(gl.DEPTH_TEST);
		// Draw the water texture
		waterTexture.bind(0);
		planeShader.uniforms({
			texture: 0, 
			tiling: 12
		}).draw(planeMesh);
		waterTexture.unbind(0);
		
		gl.enable(gl.DEPTH_TEST);
		gl.cullFace(gl.BACK);
		doCameraTransformation(gl, false);
		terrain.drawWithShader(terrainShader);
		
		// Draw terrain
		//doCameraTransformation(gl);
		
		
	};
	
	
	
	gl.fullscreen({ fov: 45, near: 0.1, far: 100000 });
	gl.animate();
	//console.log(pointsMesh);

};

function doCameraTransformation(gl, swap) {
	gl.loadIdentity();
	gl.rotate(-angleX, 1, 0, 0);
	gl.rotate(-angleY, 0, 1, 0);
	gl.translate(-camera.x, -camera.y, -camera.z);
	if (swap)
		gl.scale(1.0, -1.0, 1.0);
};



init();