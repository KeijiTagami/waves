var FULLSCREEN_VERTEX_SOURCE;
var SUBTRANSFORM_FRAGMENT_SOURCE;
var INITIAL_SPECTRUM_FRAGMENT_SOURCE;
var PHASE_FRAGMENT_SOURCE;
var SPECTRUM_FRAGMENT_SOURCE;
var NORMAL_MAP_FRAGMENT_SOURCE;
var OCEAN_VERTEX_SOURCE;
var OCEAN_FRAGMENT_SOURCE;

async function load_gl() {
    FULLSCREEN_VERTEX_SOURCE = await fetch('./gl/fullscreen.vert').then(res => res.text());
    SUBTRANSFORM_FRAGMENT_SOURCE = await fetch('./gl/subtransform.frag').then(res => res.text());
    INITIAL_SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/initial_spectrum.frag').then(res => res.text());
    PHASE_FRAGMENT_SOURCE = await fetch('./gl/phase.frag').then(res => res.text());
    SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/spectrum.frag').then(res => res.text());
    NORMAL_MAP_FRAGMENT_SOURCE = await fetch('./gl/normal_map.frag').then(res => res.text());
    OCEAN_VERTEX_SOURCE = await fetch('./gl/ocean.vert').then(res => res.text());
    OCEAN_FRAGMENT_SOURCE = await fetch('./gl/ocean.frag').then(res => res.text());
}

var Simulator = function(canvas, width, height) {
    var canvas = canvas;
    canvas.width = width;
    canvas.height = height;

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    var windX = INITIAL_WIND[0],
        windY = INITIAL_WIND[1],
        size = INITIAL_SIZE,
        choppiness = INITIAL_CHOPPINESS;

    var changed = true;

    gl.getExtension('OES_texture_float');
    gl.getExtension('OES_texture_float_linear');

    gl.clearColor.apply(gl, CLEAR_COLOR);
    gl.enable(gl.DEPTH_TEST);

    var fullscreenVertexShader = buildShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SOURCE);

    var horizontalSubtransformProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, '#define HORIZONTAL \n' + SUBTRANSFORM_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(horizontalSubtransformProgram.program);
    gl.uniform1f(horizontalSubtransformProgram.uniformLocations['u_transformSize'], RESOLUTION);

    var verticalSubtransformProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, SUBTRANSFORM_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(verticalSubtransformProgram.program);
    gl.uniform1f(verticalSubtransformProgram.uniformLocations['u_transformSize'], RESOLUTION);
    
    var initialSpectrumProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, INITIAL_SPECTRUM_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(initialSpectrumProgram.program);
    gl.uniform1f(initialSpectrumProgram.uniformLocations['u_resolution'], RESOLUTION);

    var phaseProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, PHASE_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(phaseProgram.program);
    gl.uniform1f(phaseProgram.uniformLocations['u_resolution'], RESOLUTION);

    var spectrumProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, SPECTRUM_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(spectrumProgram.program);
    gl.uniform1i(spectrumProgram.uniformLocations['u_initialSpectrum'], INITIAL_SPECTRUM_UNIT);
    gl.uniform1f(spectrumProgram.uniformLocations['u_resolution'], RESOLUTION);

    var normalMapProgram = buildProgramWrapper(gl, fullscreenVertexShader, 
        buildShader(gl, gl.FRAGMENT_SHADER, NORMAL_MAP_FRAGMENT_SOURCE), {'a_position': 0});
    gl.useProgram(normalMapProgram.program);
    gl.uniform1i(normalMapProgram.uniformLocations['u_displacementMap'], DISPLACEMENT_MAP_UNIT);
    gl.uniform1f(normalMapProgram.uniformLocations['u_resolution'], RESOLUTION);

    var oceanProgram = buildProgramWrapper(gl,
        buildShader(gl, gl.VERTEX_SHADER, OCEAN_VERTEX_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, OCEAN_FRAGMENT_SOURCE), {
            'a_position': 0,
            'a_coordinates': OCEAN_COORDINATES_UNIT
    });
    gl.useProgram(oceanProgram.program);
    gl.uniform1f(oceanProgram.uniformLocations['u_geometrySize'], GEOMETRY_SIZE);
    gl.uniform1i(oceanProgram.uniformLocations['u_displacementMap'], DISPLACEMENT_MAP_UNIT);
    gl.uniform1i(oceanProgram.uniformLocations['u_normalMap'], NORMAL_MAP_UNIT);
    gl.uniform3f(oceanProgram.uniformLocations['u_oceanColor'], OCEAN_COLOR[0], OCEAN_COLOR[1], OCEAN_COLOR[2]);
    gl.uniform3f(oceanProgram.uniformLocations['u_skyColor'], SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]);
    gl.uniform3f(oceanProgram.uniformLocations['u_sunDirection'], SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]);
    gl.uniform1f(oceanProgram.uniformLocations['u_exposure'], EXPOSURE);

    gl.enableVertexAttribArray(0);

    var fullscreenVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);
    
    var oceanData = [];
    for (var zIndex = 0; zIndex < GEOMETRY_RESOLUTION; zIndex += 1) {
        for (var xIndex = 0; xIndex < GEOMETRY_RESOLUTION; xIndex += 1) {
            oceanData.push((xIndex * GEOMETRY_SIZE) / (GEOMETRY_RESOLUTION - 1) + GEOMETRY_ORIGIN[0]);
            oceanData.push((0.0));
            oceanData.push((zIndex * GEOMETRY_SIZE) / (GEOMETRY_RESOLUTION - 1) + GEOMETRY_ORIGIN[1]);
            oceanData.push(xIndex / (GEOMETRY_RESOLUTION - 1));
            oceanData.push(zIndex / (GEOMETRY_RESOLUTION - 1));
        }
    }
    
    var oceanIndices = [];
    for (var zIndex = 0; zIndex < GEOMETRY_RESOLUTION - 1; zIndex += 1) {
        for (var xIndex = 0; xIndex < GEOMETRY_RESOLUTION - 1; xIndex += 1) {
            var topLeft = zIndex * GEOMETRY_RESOLUTION + xIndex,
                topRight = topLeft + 1,
                bottomLeft = topLeft + GEOMETRY_RESOLUTION,
                bottomRight = bottomLeft + 1;

            oceanIndices.push(topLeft);
            oceanIndices.push(bottomLeft);
            oceanIndices.push(bottomRight);
            oceanIndices.push(bottomRight);
            oceanIndices.push(topRight);
            oceanIndices.push(topLeft);
        }
    }

    var oceanBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, oceanBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(oceanData), gl.STATIC_DRAW);
    gl.vertexAttribPointer(OCEAN_COORDINATES_UNIT, 2, gl.FLOAT, false, 5 * SIZE_OF_FLOAT, 3 * SIZE_OF_FLOAT);

    var oceanIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oceanIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(oceanIndices), gl.STATIC_DRAW);

    var initialSpectrumTexture = buildTexture(gl, INITIAL_SPECTRUM_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.REPEAT, gl.REPEAT, gl.NEAREST, gl.NEAREST),
        pongPhaseTexture = buildTexture(gl, PONG_PHASE_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST),
        spectrumTexture = buildTexture(gl, SPECTRUM_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST),
        displacementMap = buildTexture(gl, DISPLACEMENT_MAP_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR),
        normalMap = buildTexture(gl, NORMAL_MAP_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.LINEAR, gl.LINEAR),
        pingTransformTexture = buildTexture(gl, PING_TRANSFORM_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST),
        pongTransformTexture = buildTexture(gl, PONG_TRANSFORM_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

    var pingPhase = true;

    var phaseArray = new Float32Array(RESOLUTION * RESOLUTION * 4);
    for (var i = 0; i < RESOLUTION; i += 1) {
        for (var j = 0; j < RESOLUTION; j += 1) {
            phaseArray[i * RESOLUTION * 4 + j * 4] = Math.random() * 2.0 * Math.PI;
            phaseArray[i * RESOLUTION * 4 + j * 4 + 1] = 0;
            phaseArray[i * RESOLUTION * 4 + j * 4 + 2] = 0;
            phaseArray[i * RESOLUTION * 4 + j * 4 + 3] = 0;
        }
    }
    var pingPhaseTexture = buildTexture(gl, PING_PHASE_UNIT, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, phaseArray, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.NEAREST);

    //changing framebuffers faster than changing attachments in WebGL
    var initialSpectrumFramebuffer = buildFramebuffer(gl, initialSpectrumTexture),
        pingPhaseFramebuffer = buildFramebuffer(gl, pingPhaseTexture),
        pongPhaseFramebuffer = buildFramebuffer(gl, pongPhaseTexture),
        spectrumFramebuffer = buildFramebuffer(gl, spectrumTexture),
        displacementMapFramebuffer = buildFramebuffer(gl, displacementMap),
        normalMapFramebuffer = buildFramebuffer(gl, normalMap),
        pingTransformFramebuffer = buildFramebuffer(gl, pingTransformTexture),
        pongTransformFramebuffer = buildFramebuffer(gl, pongTransformTexture);

    this.setWind = function (x, y) {
        windX = x;
        windY = y;
        changed = true;
    };

    this.setSize = function (newSize) {
        size = newSize;
        changed = true;
    };

    this.setChoppiness = function (newChoppiness) {
        choppiness = newChoppiness;
    };

    this.resize = function (width, height) {
        canvas.width = width;
        canvas.height = height;
    };

    this.render = function (deltaTime, projectionMatrix, viewMatrix, cameraPosition) {
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);
        gl.disable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        if (changed) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, initialSpectrumFramebuffer);
            gl.useProgram(initialSpectrumProgram.program);
            gl.uniform2f(initialSpectrumProgram.uniformLocations['u_wind'], windX, windY);
            gl.uniform1f(initialSpectrumProgram.uniformLocations['u_size'], size);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        
        //store phases separately to ensure continuity of waves during parameter editing
        gl.useProgram(phaseProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pingPhase ? pongPhaseFramebuffer : pingPhaseFramebuffer);
        gl.uniform1i(phaseProgram.uniformLocations['u_phases'], pingPhase ? PING_PHASE_UNIT : PONG_PHASE_UNIT);
        pingPhase = !pingPhase;
        gl.uniform1f(phaseProgram.uniformLocations['u_deltaTime'], deltaTime);
        gl.uniform1f(phaseProgram.uniformLocations['u_size'], size);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.useProgram(spectrumProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, spectrumFramebuffer);
        gl.uniform1i(spectrumProgram.uniformLocations['u_phases'], pingPhase ? PING_PHASE_UNIT : PONG_PHASE_UNIT);
        gl.uniform1f(spectrumProgram.uniformLocations['u_size'], size);
        gl.uniform1f(spectrumProgram.uniformLocations['u_choppiness'], choppiness);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        var subtransformProgram = horizontalSubtransformProgram;
        gl.useProgram(horizontalSubtransformProgram.program);

        //GPU FFT using Stockham formulation
        var iterations = log2(RESOLUTION) * 2;
        for (var i = 0; i < iterations; i += 1) {
            if (i === 0) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pingTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], SPECTRUM_UNIT);
            } else if (i === iterations - 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, displacementMapFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], (iterations % 2 === 0) ? PING_TRANSFORM_UNIT : PONG_TRANSFORM_UNIT);
            } else if (i % 2 === 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pongTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], PING_TRANSFORM_UNIT);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, pingTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], PONG_TRANSFORM_UNIT);
            }

            if (i === iterations / 2) {
                subtransformProgram = verticalSubtransformProgram;
                gl.useProgram(verticalSubtransformProgram.program);
            }

            gl.uniform1f(subtransformProgram.uniformLocations['u_subtransformSize'], Math.pow(2,(i % (iterations / 2)) + 1));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, normalMapFramebuffer);
        gl.useProgram(normalMapProgram.program);
        if (changed) {
            gl.uniform1f(normalMapProgram.uniformLocations['u_size'], size);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enableVertexAttribArray(OCEAN_COORDINATES_UNIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, oceanBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * SIZE_OF_FLOAT, 0);

        gl.useProgram(oceanProgram.program);
        if (changed) {
            gl.uniform1f(oceanProgram.uniformLocations['u_size'], size);
            changed = false;
        }
        gl.uniformMatrix4fv(oceanProgram.uniformLocations['u_projectionMatrix'], false, projectionMatrix);
        gl.uniformMatrix4fv(oceanProgram.uniformLocations['u_viewMatrix'], false, viewMatrix);
        gl.uniform3fv(oceanProgram.uniformLocations['u_cameraPosition'], cameraPosition);
        gl.drawElements(gl.TRIANGLES, oceanIndices.length, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(OCEAN_COORDINATES_UNIT);
        
    };

};
