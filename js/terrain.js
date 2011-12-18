/****** PROCEDURAL TERRAIN WITH A LAKE ******/


function GridPoint(x, y) {
	this.x = x;
	this.y = y;
}

var orderedPoints = [];
function TerrainGrid(sizeX, sizeZ, positionY) {
	this.decay = 1;
	this.depth = 6;
	this.roughness = (sizeX + sizeZ) / 2 * .08;
	this.dip = (sizeX + sizeZ) / 2 * .25;
	this.gridLen = Math.pow(2, this.depth) + 1;
	this.allPoints = [];
	this.orderedPoints = orderedPoints;
	this.flippedOrderedPoints = [];
	this.normals = [];
	this.orderedNormals = [];
	this.flippedOrderedNormals = [];
	this.mesh = new GL.Mesh({ normals: true, coords: true});
	this.flippedMesh = new GL.Mesh({ normals: true, coords: true});
	this.triangles = [];
	
	

	// mountain textures
	this.grassTexture = GL.Texture.fromURL('textures/grass.jpg');
	this.dirtTexture = GL.Texture.fromURL('textures/dirt.jpg');
	this.rockTexture = GL.Texture.fromURL('textures/rock.jpg');
	this.snowTexture = GL.Texture.fromURL('textures/snow.jpg');
	
	this.getPerturb = function(currDepth) {
		var pert = this.roughness
	           * Math.pow(currDepth / this.depth, this.decay)
	           * (-100 + Math.random() * 200) / 100.0;
		return pert;
	}
	
	this.getIndex = function(g) {
		col = g.x;
		row = g.y;
		if (row < 0 || row >= this.gridLen || col < 0 || col >= this.gridLen)
	        return -1;
	    return row * this.gridLen + col;
	}
	
	this.subdivideSquare = function(topleft, botright, curDepth) {
		if (curDepth == 0) return;
		
		// corner coordinates (in the grid space [x,y])
	    var TL = new GridPoint(topleft.x, topleft.y);
	    var TR = new GridPoint(botright.x, topleft.y);
	    var BL = new GridPoint(topleft.x, botright.y);
	    var BR = new GridPoint(botright.x, botright.y);
	


	    // corner vertices on the terrain (in the grid space [x,y,z])
	    var vTL = this.allPoints[this.getIndex(TL)];
	    var vTR = this.allPoints[this.getIndex(TR)];
	    var vBL = this.allPoints[this.getIndex(BL)];
	    var vBR = this.allPoints[this.getIndex(BR)];
	
	    var midX = parseInt((botright.x + topleft.x) / 2);
	    var midY = parseInt((botright.y + topleft.y) / 2);
	
	    //top center
	    this.allPoints[this.getIndex(new GridPoint(midX, TL.y))] = new Vector((vTR.x + vTL.x)/2, (vTR.y + vTL.y)/2, (vTR.z + vTL.z)/2);
		//center left
	    this.allPoints[this.getIndex(new GridPoint(TL.x, midY))] = new Vector((vTL.x + vBL.x)/2, (vTL.y + vBL.y)/2, (vTL.z + vBL.z)/2);
		//center right
	    this.allPoints[this.getIndex(new GridPoint(TR.x, midY))] = new Vector((vTR.x + vBR.x)/2, (vTR.y + vBR.y)/2, (vTR.z + vBR.z)/2);
		//bottom center
	    this.allPoints[this.getIndex(new GridPoint(midX, BL.y))] = new Vector ((vBR.x + vBL.x)/2, (vBR.y + vBL.y)/2, (vBR.z + vBL.z)/2);
		//center center
	    this.allPoints[this.getIndex(new GridPoint(midX, midY))] = new Vector((vBR.x + vBL.x + vTR.x + vTL.x)/4, (vBR.y + vBL.y + vTR.y + vTL.y)/4, (vBR.z + vBL.z + vTR.z + vTL.z)/4);
		this.allPoints[this.getIndex(new GridPoint(midX, midY))].y += this.getPerturb(curDepth);

	    // recurrrrr
	    curDepth--;
	    this.subdivideSquare(TL, new GridPoint(midX, midY), curDepth);
	    this.subdivideSquare(new GridPoint(midX, midY), BR, curDepth);
	    this.subdivideSquare(new GridPoint(TL.x, midY), new GridPoint(midX, BR.y), curDepth);
	    this.subdivideSquare(new GridPoint(midX, TL.y), new GridPoint(TR.x, midY), curDepth);
	}
	
	this.makeLake = function() {
		for (var row = 0; row < this.gridLen; row++) {
			for (var col = 0; col < this.gridLen; col++) {
				var centerOffsetX = Math.max(Math.abs(col - this.gridLen / 2) - 3.5, 0);
				var centerOffsetY = Math.max(Math.abs(row - this.gridLen / 2) - 3.5, 0);
				var centerCoeff = .8 - Math.sqrt(centerOffsetX * centerOffsetX + centerOffsetY * centerOffsetY) / (this.gridLen / 2);
				centerCoeff = centerCoeff * centerCoeff * centerCoeff * centerCoeff * 2;
				this.allPoints[this.getIndex(new GridPoint(col, row))].y -= centerCoeff * this.dip;
			}	
		}
	}
	
	this.drawWithShader = function(shader) {
		this.dirtTexture.bind(0);
		this.snowTexture.bind(1);
		this.rockTexture.bind(2);
		this.grassTexture.bind(3);
		
		var start = -60.0;
		var offset = 75.0;
		
		shader.uniforms({
			dirtTexture: 0,
			snowTexture: 1,
			rockTexture: 2,
			grassTexture: 3,
			dirtMin: start,
			dirtMax: start + offset,
			grassMin: start + offset,
			grassMax: start + 2 * offset,
			rockMin: start + 2 * offset,
			rockMax: start + 3 * offset,
			snowMin: start + 3 * offset,
			snowMax: start + 5 * offset,
			tiling: 1
		}).draw(this.mesh);
		
		this.dirtTexture.unbind(0);
		this.snowTexture.unbind(1);
		this.rockTexture.unbind(2);
		this.grassTexture.unbind(3);
		
	}
	
	this.calcStrip = function() {
		for (var row = 0; row < this.gridLen - 1; row++) {
			for (var col = 0; col < this.gridLen - 1; col++) {
				var indextl = this.getIndex(new GridPoint(col, row));
				var indexbl = this.getIndex(new GridPoint(col, row + 1));
				var indextr = this.getIndex(new GridPoint(col + 1, row));
				var indexbr = this.getIndex(new GridPoint(col + 1, row + 1));
				this.triangles.push([indextr, indexbl, indextl]);
				this.triangles.push([indextr, indexbr, indexbl]);
			}
		}
			
		
		for (var row = 0; row < this.gridLen; row++) {
			for (var col = 0; col < this.gridLen; col++) {
				var curr = this.allPoints[this.getIndex(new GridPoint(col, row))];
				var currNorm = this.normals[this.getIndex(new GridPoint(col, row))];
				this.orderedPoints.push([curr.x, curr.y, curr.z]);
				this.flippedOrderedPoints.push([curr.x, -curr.y, curr.z]);
				this.orderedNormals.push([currNorm.x, currNorm.y, currNorm.z]);
				this.flippedOrderedNormals.push([currNorm.x, -currNorm.y, currNorm.z]);
			}
		}

		function comparator(triangle1, triangle2) {
				
			var tri1point1 = orderedPoints[triangle1[0]];			
			var tri1point2 = orderedPoints[triangle1[1]];
			var tri1point3 = orderedPoints[triangle1[2]];
			var tri1pointAvg = [(tri1point1[0] + tri1point2[0] + tri1point3[0])/3.0, (tri1point1[1] + tri1point2[1] + tri1point3[1])/3.0, (tri1point1[2] + tri1point2[2] + tri1point3[2])/3.0];
			var distFromCenter1 = Math.sqrt(tri1pointAvg[0]*tri1pointAvg[0] + tri1pointAvg[1]*tri1pointAvg[1] + tri1pointAvg[2]*tri1pointAvg[2]);
			
			var tri2point1 = orderedPoints[triangle2[0]];
			var tri2point2 = orderedPoints[triangle2[1]];
			var tri2point3 = orderedPoints[triangle2[2]];
			var tri2pointAvg = [(tri2point1[0] + tri2point2[0] + tri2point3[0])/3.0, (tri2point1[1] + tri2point2[1] + tri2point3[1])/3.0, (tri2point1[2] + tri2point2[2] + tri2point3[2])/3.0];
			var distFromCenter2 = Math.sqrt(tri2pointAvg[0]*tri2pointAvg[0] + tri2pointAvg[1]*tri2pointAvg[1] + tri2pointAvg[2]*tri2pointAvg[2]);
			
			return distFromCenter2 - distFromCenter1;			
		}

		this.triangles = this.triangles.sort(comparator);
	}
	
	this.getNeighbors = function(coordinate) {
		var coords = [];
		coords[0] = new GridPoint(coordinate.x, coordinate.y - 1);
	    coords[1] = new GridPoint(coordinate.x + 1, coordinate.y - 1);
	    coords[2] = new GridPoint(coordinate.x + 1, coordinate.y);
	    coords[3] = new GridPoint(coordinate.x + 1, coordinate.y + 1);
	    coords[4] = new GridPoint(coordinate.x, coordinate.y + 1);
	    coords[5] = new GridPoint(coordinate.x - 1, coordinate.y + 1);
	    coords[6] = new GridPoint(coordinate.x - 1, coordinate.y);
	    coords[7] = new GridPoint(coordinate.x - 1, coordinate.y - 1);
		
		var neigh = []

	    for (i = 0; i < 8; i++) {
	        var index = this.getIndex(coords[i]);
	        if (index != -1) {
	            neigh.push(this.allPoints[index]);
			}
	    }

	    return neigh;
	}
	
	this.calcNormals = function () {
		for (var row = 0; row < this.gridLen; row ++) {
			for (var col = 0; col < this.gridLen; col++) {
				var gp = new GridPoint(row, col);
				var index = this.getIndex(gp);
				var vertexPosition = this.allPoints[index];
				var neighbors = this.getNeighbors(gp);
				
				
				var offsets = [];
				for (var i = 0; i < neighbors.length; ++i) {
					offsets[i] = new GL.Vector(neighbors[i].x - vertexPosition.x, neighbors[i].y - vertexPosition.y, neighbors[i].z - vertexPosition.z);
					offsets[i] = offsets[i].divide(offsets[i].length());
				}
				
				var norms = [];
				for (var i = 0; i < neighbors.length; ++i) {
					norms[i] = offsets[i].cross(offsets[(i+1) % neighbors.length]);
				}
				
				var sum = new GL.Vector();
				for (var i = 0; i < neighbors.length; ++i)
					sum = sum.add(norms[i]);
				
				
				sum = sum.divide(sum.length());
				
				this.normals[index] = sum;
			}
		}
	}
	
	this.init = function() {
		var tl = new Vector(-sizeX/2, positionY, -sizeZ/2);
		var tr = new Vector(sizeX/2, positionY, -sizeZ/2);
		var bl = new Vector(-sizeX/2, positionY, sizeZ/2);
		var br = new Vector(sizeX/2, positionY, sizeZ/2);
		var tlg = new GridPoint(0,0);
	    var trg = new GridPoint(0,this.gridLen-1);
	    var blg = new GridPoint(this.gridLen-1, 0);
	    var brg = new GridPoint(this.gridLen-1, this.gridLen-1);
		this.allPoints[this.getIndex(tlg)] = tl;
		this.allPoints[this.getIndex(trg)] = tr;
		this.allPoints[this.getIndex(blg)] = bl;
		this.allPoints[this.getIndex(brg)] = br;
		this.subdivideSquare(tlg, brg, this.depth);
		this.makeLake();
		this.calcNormals();
		this.calcStrip();
		this.mesh.vertices = this.orderedPoints;
		this.mesh.normals = this.orderedNormals;
		this.mesh.triangles = this.triangles;
		this.flippedMesh.vertices = this.flippedOrderedPoints;
		this.flippedMesh.normals = this.flippedOrderedNormals;
		this.flippedMesh.triangles = this.triangles;
		this.mesh.coords = this.getCoords();
		this.mesh.compile();
		this.flippedMesh.compile();
	}
	
	this.getCoords = function() {
		var coords = [];
		for (var row = 0; row < this.gridLen; row++) {
			for (var col = 0; col < this.gridLen; col++) {
				coords.push([row/this.gridLen, col/this.gridLen]);
			}
		}
		return coords;
	}
	
	this.init();
	
}