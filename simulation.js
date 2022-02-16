let FULLSCREEN_VERTEX_SOURCE;
let SUBTRANSFORM_FRAGMENT_SOURCE;
let INITIAL_SPECTRUM_FRAGMENT_SOURCE;
let PHASE_FRAGMENT_SOURCE;
let SPECTRUM_FRAGMENT_SOURCE;
let NORMAL_MAP_FRAGMENT_SOURCE;
let OCEAN_VERTEX_SOURCE;
let OCEAN_FRAGMENT_SOURCE;

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

class Simulator {

    constructor(canvas, width, height) {
        canvas.width = width;
        canvas.height = height;

        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');

        gl.clearColor.apply(gl, CLEAR_COLOR);
        gl.enable(gl.DEPTH_TEST);

        function buildFullscreenProgram(src) {
            let v = null;
            if (v == null) {
                v = buildShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SOURCE);
            }
            const f = buildShader(gl, gl.FRAGMENT_SHADER, src);
            const p = {'a_position': 0};
            return buildProgramWrapper(gl, v, f, p);
        }
        this.horizontalSubtransformProgram = buildFullscreenProgram('#define HORIZONTAL \n' + SUBTRANSFORM_FRAGMENT_SOURCE);
        this.verticalSubtransformProgram = buildFullscreenProgram(SUBTRANSFORM_FRAGMENT_SOURCE);
        this.initialSpectrumProgram = buildFullscreenProgram(INITIAL_SPECTRUM_FRAGMENT_SOURCE);
        this.phaseProgram = buildFullscreenProgram(PHASE_FRAGMENT_SOURCE);
        this.spectrumProgram = buildFullscreenProgram(SPECTRUM_FRAGMENT_SOURCE);
        this.normalMapProgram = buildFullscreenProgram(NORMAL_MAP_FRAGMENT_SOURCE);

        this.oceanProgram = (() => {
            const v = buildShader(gl, gl.VERTEX_SHADER, OCEAN_VERTEX_SOURCE);
            const f = buildShader(gl, gl.FRAGMENT_SHADER, OCEAN_FRAGMENT_SOURCE);
            const p = {'a_position': 0, 'a_coodinates': OCEAN_COORDINATES_UNIT};
            return buildProgramWrapper(gl, v, f, p);
        })();

        let p;
        function useProgram(program) { p = program; gl.useProgram(p.program); }
        function uniform1i(name, val) { gl.uniform1i(p.uniformLocations[name], val); }
        function uniform1f(name, val) { gl.uniform1f(p.uniformLocations[name], val); }
        function uniform3f(name, v1, v2, v3) { gl.uniform3f(p.uniformLocations[name], v1, v2, v3); }

        useProgram(this.horizontalSubtransformProgram);
        uniform1f('u_transformSize', RESOLUTION);

        useProgram(this.verticalSubtransformProgram);
        uniform1f('u_transformSize', RESOLUTION);
        
        useProgram(this.initialSpectrumProgram);
        uniform1f('u_resolution', RESOLUTION);

        useProgram(this.phaseProgram);
        uniform1f('u_resolution', RESOLUTION);

        useProgram(this.spectrumProgram);
        uniform1i('u_initialSpectrum', INITIAL_SPECTRUM_UNIT);
        uniform1f('u_resolution', RESOLUTION);

        useProgram(this.normalMapProgram);
        uniform1i('u_displacementMap', DISPLACEMENT_MAP_UNIT);
        uniform1f('u_resolution', RESOLUTION);

        useProgram(this.oceanProgram);
        uniform1f('u_geometrySize', GEOMETRY_SIZE);
        uniform1i('u_displacementMap', DISPLACEMENT_MAP_UNIT);
        uniform1i('u_normalMap', NORMAL_MAP_UNIT);
        uniform3f('u_oceanColor', OCEAN_COLOR[0], OCEAN_COLOR[1], OCEAN_COLOR[2]);
        uniform3f('u_skyColor', SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]);
        uniform3f('u_sunDirection', SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]);
        uniform1f('u_exposure', EXPOSURE);
        
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

        var phaseArray = new Float32Array(RESOLUTION * RESOLUTION * 4);
        for (var i = 0; i < RESOLUTION; i += 1) {
            for (var j = 0; j < RESOLUTION; j += 1) {
                phaseArray[i * RESOLUTION * 4 + j * 4] = Math.random() * 2.0 * Math.PI;
                phaseArray[i * RESOLUTION * 4 + j * 4 + 1] = 0;
                phaseArray[i * RESOLUTION * 4 + j * 4 + 2] = 0;
                phaseArray[i * RESOLUTION * 4 + j * 4 + 3] = 0;
            }
        }

        gl.enableVertexAttribArray(0);

        var fullscreenVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fullscreenVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]), gl.STATIC_DRAW);

        var oceanBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, oceanBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(oceanData), gl.STATIC_DRAW);
        gl.vertexAttribPointer(OCEAN_COORDINATES_UNIT, 2, gl.FLOAT, false, 5 * SIZE_OF_FLOAT, 3 * SIZE_OF_FLOAT);

        var oceanIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, oceanIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(oceanIndices), gl.STATIC_DRAW);

        function buildFramebufferLocal(unit, phase=null, edge=gl.CLAMP_TO_EDGE, interp=gl.NEAREST) {
            return buildFramebuffer(gl, buildTexture(
                gl, unit, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, null, edge, edge, interp, interp,
            ));
        }
        this.initialSpectrumFramebuffer = buildFramebufferLocal(INITIAL_SPECTRUM_UNIT, {edge: gl.REPEAT});
        this.pingPhaseFramebuffer = buildFramebufferLocal(PING_PHASE_UNIT, {phase: phaseArray});
        this.pongPhaseFramebuffer = buildFramebufferLocal(PONG_PHASE_UNIT);
        this.spectrumFramebuffer = buildFramebufferLocal(SPECTRUM_UNIT);
        this.displacementMapFramebuffer = buildFramebufferLocal(DISPLACEMENT_MAP_UNIT, {interp: gl.LINEAR});
        this.normalMapFramebuffer = buildFramebufferLocal(NORMAL_MAP_UNIT, {interp: gl.LINEAR});
        this.pingTransformFramebuffer = buildFramebufferLocal(PING_TRANSFORM_UNIT);
        this.pongTransformFramebuffer = buildFramebufferLocal(PONG_TRANSFORM_UNIT);

        this.changed = true;
        this.windX = INITIAL_WIND[0];
        this.windY = INITIAL_WIND[1];
        this.size = INITIAL_SIZE;
        this.choppiness = INITIAL_CHOPPINESS;
        this.canvas = canvas;

        this.fullscreenVertexBuffer = fullscreenVertexBuffer;
        this.oceanBuffer = oceanBuffer; 
        this.oceanIndices = oceanIndices;

        this.pingPhase = true;
    }

    setWind(x, y) {
        this.windX = x;
        this.windY = y;
        this.changed = true;
    }

    setSize(newSize) {
        this.size = newSize;
        this.changed = true;
    }

    setChoppiness(newChoppiness) {
        this.choppiness = newChoppiness;
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    render(deltaTime, projectionMatrix, viewMatrix, cameraPosition) {
        var gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');

        gl.viewport(0, 0, RESOLUTION, RESOLUTION);
        gl.disable(gl.DEPTH_TEST);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.fullscreenVertexBuffer);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        if (this.changed) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.initialSpectrumFramebuffer);
            gl.useProgram(this.initialSpectrumProgram.program);
            gl.uniform2f(this.initialSpectrumProgram.uniformLocations['u_wind'], this.windX, this.windY);
            gl.uniform1f(this.initialSpectrumProgram.uniformLocations['u_size'], this.size);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        
        //store phases separately to ensure continuity of waves during parameter editing
        gl.useProgram(this.phaseProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPhase ? this.pongPhaseFramebuffer : this.pingPhaseFramebuffer);
        gl.uniform1i(this.phaseProgram.uniformLocations['u_phases'], this.pingPhase ? PING_PHASE_UNIT : PONG_PHASE_UNIT);
        this.pingPhase = !this.pingPhase;
        gl.uniform1f(this.phaseProgram.uniformLocations['u_deltaTime'], deltaTime);
        gl.uniform1f(this.phaseProgram.uniformLocations['u_size'], this.size);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.useProgram(this.spectrumProgram.program);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.spectrumFramebuffer);
        gl.uniform1i(this.spectrumProgram.uniformLocations['u_phases'], this.pingPhase ? PING_PHASE_UNIT : PONG_PHASE_UNIT);
        gl.uniform1f(this.spectrumProgram.uniformLocations['u_size'], this.size);
        gl.uniform1f(this.spectrumProgram.uniformLocations['u_choppiness'], this.choppiness);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        var subtransformProgram = this.horizontalSubtransformProgram;
        gl.useProgram(subtransformProgram.program);

        //GPU FFT using Stockham formulation
        var iterations = log2(RESOLUTION) * 2;
        for (var i = 0; i < iterations; i += 1) {
            if (i === 0) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], SPECTRUM_UNIT);
            } else if (i === iterations - 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.displacementMapFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], (iterations % 2 === 0) ? PING_TRANSFORM_UNIT : PONG_TRANSFORM_UNIT);
            } else if (i % 2 === 1) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.pongTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], PING_TRANSFORM_UNIT);
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingTransformFramebuffer);
                gl.uniform1i(subtransformProgram.uniformLocations['u_input'], PONG_TRANSFORM_UNIT);
            }

            if (i === iterations / 2) {
                subtransformProgram = this.verticalSubtransformProgram;
                gl.useProgram(subtransformProgram.program);
            }

            gl.uniform1f(subtransformProgram.uniformLocations['u_subtransformSize'], Math.pow(2,(i % (iterations / 2)) + 1));
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.normalMapFramebuffer);
        gl.useProgram(this.normalMapProgram.program);
        if (this.changed) {
            gl.uniform1f(this.normalMapProgram.uniformLocations['u_size'], this.size);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.enableVertexAttribArray(OCEAN_COORDINATES_UNIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.oceanBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 5 * SIZE_OF_FLOAT, 0);

        gl.useProgram(this.oceanProgram.program);
        if (this.changed) {
            gl.uniform1f(this.oceanProgram.uniformLocations['u_size'], this.size);
            this.changed = false;
        }
        gl.uniformMatrix4fv(this.oceanProgram.uniformLocations['u_projectionMatrix'], false, projectionMatrix);
        gl.uniformMatrix4fv(this.oceanProgram.uniformLocations['u_viewMatrix'], false, viewMatrix);
        gl.uniform3fv(this.oceanProgram.uniformLocations['u_cameraPosition'], cameraPosition);
        gl.drawElements(gl.TRIANGLES, this.oceanIndices.length, gl.UNSIGNED_SHORT, 0);

        gl.disableVertexAttribArray(OCEAN_COORDINATES_UNIT);
        
    }

}
