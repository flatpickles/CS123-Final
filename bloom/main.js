// recreate textures with new canvas sizes
window.onresize = function() {
    tex0 = new GL.Texture(gl.canvas.width, gl.canvas.height);
    tex1 = new GL.Texture(gl.canvas.width, gl.canvas.height);
    tex2 = new GL.Texture(gl.canvas.width, gl.canvas.height);
}

window.onload = function() { 
    var theta = -270;
    var phi = -12;
    gl = GL.create();
    var light = new GL.Vector(0, 5, 0);
    var reflectShader = new GL.Shader("reflectVert", "reflectFrag");
    var refractShader = new GL.Shader("refractVert", "refractFrag");
    var blurShader = new GL.Shader("blurVert", "blurFrag");
    var brightpassShader = new GL.Shader("brightpassVert", "brightpassFrag");
    var quadShader = new GL.Shader("quadVert", "quadFrag");
    var quad = new GL.Mesh.plane({ coords: true });

    var dragonMesh = GL.Mesh.load(dragon);
    var urls = [];
    urls.push("astra/posx.jpg");
    urls.push("astra/negx.jpg");
    urls.push("astra/posy.jpg");
    urls.push("astra/negy.jpg");
    urls.push("astra/posz.jpg");
    urls.push("astra/negz.jpg");
    var cubeMap = GL.CubeMap.fromURLs(urls);
    var skybox = GL.Mesh.cube({ coords: true });
    skybox.transform(GL.Matrix.scale(100, 100, 100));

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

    gl.onmousemove = function(e) {
      if (e.dragging) {
        theta -= e.deltaX * 0.25;
        phi = Math.max(-90, Math.min(90, phi - e.deltaY * 0.25));
      }
    };

    gl.onupdate = function(seconds) {
    };

    applyPerspectiveCamera = function(width, height) {
        var zoom = 3.5;
        var ratio = width / height;
        var dir = GL.Vector.fromAngles(-Math.PI * theta / 180, -Math.PI * phi / 180).negative();
        var eye = dir.multiply(-zoom);

        gl.matrixMode(gl.PROJECTION);
        gl.loadIdentity();
        gl.perspective(60, ratio, 0.1, 1000);
        gl.lookAt(eye.x, eye.y, eye.z, eye.x + dir.x, eye.y + dir.y, eye.z + dir.z,
                  0, 1, 0);
        gl.matrixMode(gl.MODELVIEW);
        gl.loadIdentity();
    }

    renderScene = function() {
        // Enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // Enable cube maps and draw the skybox
        cubeMap.bind();
        skyboxShader.draw(skybox);

        // Enable culling (back) faces for rendering the dragon
        gl.enable(gl.CULL_FACE);

        // Render the dragon with the refraction shader bound
        gl.pushMatrix();
        gl.translate(1.25, 0, 0);
        gl.scale(0.01, 0.01, 0.01);
        refractShader.uniforms({
            light: gl.modelviewMatrix.transformPoint(light)
        }).draw(dragonMesh);
        gl.popMatrix();

        // Render the dragon with the reflection shader bound
        gl.pushMatrix();
        gl.translate(-1.25, 0, 0);
        gl.scale(0.01, 0.01, 0.01);
        reflectShader.uniforms({
            light: gl.modelviewMatrix.transformPoint(light)
        }).draw(dragonMesh);
        gl.popMatrix();

        // Disable culling, depth testing and cube maps
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        cubeMap.unbind();
    }

    gl.ondraw = function() {
      var width = gl.canvas.width, height = gl.canvas.height;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.loadIdentity();

      // draw scene to tex0
      applyPerspectiveCamera(width, height);
      tex0.drawTo(renderScene);

      // draw brightpass-filtered scene to tex1
      tex1.drawTo(function() {
          tex0.bind();
          brightpassShader.draw(quad);
          tex0.unbind();
      });

      // draw tex0 to screen
      tex0.bind();
      quadShader.draw(quad);
      tex0.unbind();

      // apply guassian blur to brightpass result
      tex2.drawTo(function() {
          tex1.bind();
          // adjust intensity for more intense bloom
          blurShader.uniforms({
              intensity: 1.25,
              dir: [1 / width, 0]
          }).draw(quad);
          tex1.unbind();
      });
      tex1.swapWith(tex2);
      tex2.drawTo(function() {
          tex1.bind();
          blurShader.uniforms({
              dir: [0, 1 / height]
          }).draw(quad);
          tex1.unbind();
      });

      // blend in blurred brightpass on screen
      gl.enable(gl.BLEND);
      tex2.bind();
      gl.blendFunc(gl.ONE, gl.ONE);
      quadShader.draw(quad);
      gl.disable(gl.BLEND);
      tex2.unbind();
    };

    // onresize must be called before and after fullscreen: 
    // (hack to make sure textures are always defined and correctly resize)
    window.onresize();
    gl.fullscreen();
    gl.animate();
    window.onresize();
}
