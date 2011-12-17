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
var MIN_AGE = -1; 
var AIR_RESISTANCE = 0.020;
var INITIAL_SPEED = 600;
var RECUR_DEPTH = 2;
var PLANE_WORLD_SIZE = 4500;

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
var brightnessBoom = 0;
var flipped = false;

// A list of all the points to be drawn. For points A, B: [ax, ay, az, bx, by, bz]
//var pointDict = {"vertices": [[2,3,4], [1,2,3]]};
var pointsMesh = new GL.Mesh();
pointsMesh.addVertexBuffer('colors', 'gl_Color');
var meshShader = new GL.Shader('pointVert', 'pointFrag');

var terrain = new TerrainGrid(3000, 3000, 100);
var terrainShader = new GL.Shader('terrainVert', 'terrainFrag');

// Setup sky 

var urls = [];
urls.push("textures/skybox/nx.jpg");
urls.push("textures/skybox/px.jpg");
urls.push("textures/skybox/py.jpg");
urls.push("textures/skybox/ny.jpg")
urls.push("textures/skybox/nz.jpg");
urls.push("textures/skybox/pz.jpg");

var cubeMap = GL.CubeMap.fromURLs(urls);
var skybox = GL.Mesh.cube({ coords: true });
skybox.transform(GL.Matrix.scale(4000, 4000, 4000));
skybox.transform(GL.Matrix.translate(0, 0, 0));


var skyboxShader = new GL.Shader('\
  varying vec3 pos;\
  void main() {\
	gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
	pos = gl_Vertex.xyz;\
  }\
', '\
  uniform samplerCube cubeMap;\
  varying vec3 pos;\
  void main() {\
	gl_FragColor = textureCube(cubeMap, normalize(pos));\
  }\
');

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

Firework.generate = function () {
	var pos = new Vector(0, 0, 0);
	var vel = new Vector(Math.random()*500.0 - 250, INITIAL_SPEED*(Math.random() + 1.0), Math.random()*500.0 - 250);
	var color = new Vector(Math.random()*.95 + .05, Math.random()*.95 + .05, Math.random()*.95 + .05);
	var lifetime = 1 + Math.random()*0.5; // explode after one second
	var depth = RECUR_DEPTH;
	
	var hugeRandom = Math.random();
	if (hugeRandom > 0.6) {
		vel.y *= 2.5;
	}
	return new Firework(pos, vel, color, lifetime, true, depth, true);
};


function init() {
	
	var fireworks = [];
		
	var pos = new Vector(0, 0, 0);
	var vel = new Vector(0, INITIAL_SPEED, 0);
	var color = new Vector(1.0, 0, 0);
	var lifetime = 1; // explode after three seconds
	
	setInterval(function() {
		var firework = Firework.generate();
		fireworks.push(firework);
	}, 2000);
	
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
		gl.enable(gl.FOG);
		//gl.clearColor(0.0, 0.0, 0.0, 0.0);
		//gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.CULL_FACE);
		//gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		
		
		// Draw skybox, set culling to be the front since we're inside
		gl.cullFace(gl.FRONT);
		doCameraTransformation(gl, false);
		cubeMap.bind();
		skyboxShader.draw(skybox);		
		
		// Draw terrain reflections with no depth test
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
	};
	
	var dragging = false;
	var prevE = null;
	
	window.onmousedown = function(e) {
		var tracer = new GL.Raytracer();
		var ray = tracer.getRayForPixel(e.x, e.y);
		result = GL.Raytracer.hitTestBox(tracer.eye, ray, new GL.Vector(-1000, -1000, camera.z - 500), new GL.Vector(1000, 1000, camera.z - 501));
		//fireworks.push(new Firework(new Vector(result.hit.x, result.hit.y, -200), new Vector(0, 0, 0), new Vector(1.0, 0, 0), 1, false, 1)); // wont work because not rotated
		//fireworks.push(new Firework(new Vector(-50, 250, 500), new Vector(0, 100, 0), new Vector(1.0, 0, 0), 0, true, 1));
		dragging = true;
		prevE = e;
	};
	
	window.onmouseup = function(e) {
		dragging = false;
	}
	
	window.onmousemove = function(e) {
		if (dragging) {
			var deltaX = -prevE.x + e.x;
			var deltaY = -prevE.y + e.y;
			angleY -= deltaX * 0.25;
			angleX = Math.max(-90, Math.min(90, angleX - deltaY * 0.25));
			//fireworks.push(new Firework(new Vector(0, 500, 500), new Vector(0, 300, 0), new Vector(1.0, 0, 0), 0, true, 1));
		}  
		
		prevE = e;
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