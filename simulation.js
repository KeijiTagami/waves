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

class Buffer {

    constructor(gl, data, element=false) {
        const type = element ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
        const buffer = gl.createBuffer();
        gl.bindBuffer(type, buffer);
        gl.bufferData(type, data, gl.STATIC_DRAW);
        this.gl = gl;
        this.type = type
        this.buffer = buffer;
    }

    vertexAttribPointer(a, b, c, d) {
        const gl = this.gl
        gl.bindBuffer(this.type, this.buffer);
        gl.vertexAttribPointer(a, b, gl.FLOAT, false, c, d);
        return this;
    }

}

class Framebuffer {

    constructor({gl, unit, data=null, wrap=gl.CLAMP_TO_EDGE, filter=gl.NEAREST}) {
        this.gl = gl;
        this.framebuffer = buildFramebuffer(gl, buildTexture(
            gl, unit, gl.RGBA, gl.FLOAT, RESOLUTION, RESOLUTION, data, wrap, wrap, filter, filter,
        ));
    }

    draw() {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

}

class FullscreenProgram extends Program {

    constructor(gl, src) {
        let v = null;
        if (v == null) {
            v = buildShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERTEX_SOURCE);
        }
        const f = buildShader(gl, gl.FRAGMENT_SHADER, src);
        const p = {'a_position': 0};
        super(gl, v, f, p);
    }

}

class OceanProgram extends Program {

    constructor(gl) {
        const v = buildShader(gl, gl.VERTEX_SHADER, OCEAN_VERTEX_SOURCE);
        const f = buildShader(gl, gl.FRAGMENT_SHADER, OCEAN_FRAGMENT_SOURCE);
        const p = {'a_position': 0, 'a_coodinates': OCEAN_COORDINATES_UNIT};
        super(gl, v, f, p);
    }

}

class Simulator {

    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.resize(width, height);
        this.setWind(INITIAL_WIND[0], INITIAL_WIND[1]);
        this.setSize(INITIAL_SIZE);
        this.setChoppiness(INITIAL_CHOPPINESS);
        this.pingPhase = true;

        const gl = this.gl();
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');
        gl.clearColor.apply(gl, CLEAR_COLOR);
        gl.enable(gl.DEPTH_TEST);

        this.horizontalSubtransformProgram =
            new FullscreenProgram(gl, '#define HORIZONTAL \n' + SUBTRANSFORM_FRAGMENT_SOURCE).
            uniform1f('u_transformSize', RESOLUTION); 
        this.verticalSubtransformProgram = new FullscreenProgram(gl, SUBTRANSFORM_FRAGMENT_SOURCE).
            uniform1f('u_transformSize', RESOLUTION);
        this.initialSpectrumProgram = new FullscreenProgram(gl, INITIAL_SPECTRUM_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.phaseProgram = new FullscreenProgram(gl, PHASE_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.spectrumProgram = new FullscreenProgram(gl, SPECTRUM_FRAGMENT_SOURCE).
            uniform1i('u_initialSpectrum', INITIAL_SPECTRUM_UNIT).
            uniform1f('u_resolution', RESOLUTION);
        this.normalMapProgram = new FullscreenProgram(gl, NORMAL_MAP_FRAGMENT_SOURCE).
            uniform1i('u_displacementMap', DISPLACEMENT_MAP_UNIT).
            uniform1f('u_resolution', RESOLUTION);
        this.oceanProgram = new OceanProgram(gl).
            uniform1f('u_geometrySize', GEOMETRY_SIZE).
            uniform1i('u_displacementMap', DISPLACEMENT_MAP_UNIT).
            uniform1i('u_normalMap', NORMAL_MAP_UNIT).
            uniform3f('u_oceanColor', OCEAN_COLOR[0], OCEAN_COLOR[1], OCEAN_COLOR[2]).
            uniform3f('u_skyColor', SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]).
            uniform3f('u_sunDirection', SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]).
            uniform1f('u_exposure', EXPOSURE);

        this.fullscreenVertexBuffer = new Buffer(gl, fullscreenData());
        this.oceanBuffer = new Buffer(gl, oceanData());
        new Buffer(gl, oceanIndices(), true);

        /* switch in update and render
        this.oceanBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 3, 5 * SIZE_OF_FLOAT, 0);
        this.fullscreenVertexBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 2, 0, 0);
        */
        gl.enableVertexAttribArray(FULLSCREEN_COORDINATES_UNIT);
        this.oceanBuffer.
            vertexAttribPointer(OCEAN_COORDINATES_UNIT, 2, 5 * SIZE_OF_FLOAT, 3 * SIZE_OF_FLOAT);
        gl.enableVertexAttribArray(OCEAN_COORDINATES_UNIT);

        this.oceanIndicesLength = 6 * (GEOMETRY_RESOLUTION - 1) * (GEOMETRY_RESOLUTION - 1);
        this.initialSpectrumFramebuffer = new Framebuffer({gl: gl, unit: INITIAL_SPECTRUM_UNIT, wrap: gl.REPEAT});
        this.pingPhaseFramebuffer = new Framebuffer({gl: gl, unit: PING_PHASE_UNIT, data: phaseArray()});
        this.pongPhaseFramebuffer = new Framebuffer({gl: gl, unit: PONG_PHASE_UNIT});
        this.spectrumFramebuffer = new Framebuffer({gl: gl, unit: SPECTRUM_UNIT});
        this.displacementMapFramebuffer = new Framebuffer({gl: gl, unit: DISPLACEMENT_MAP_UNIT, filter: gl.LINEAR});
        this.normalMapFramebuffer = new Framebuffer({gl: gl, unit: NORMAL_MAP_UNIT, filter: gl.LINEAR});
        this.pingTransformFramebuffer = new Framebuffer({gl: gl, unit: PING_TRANSFORM_UNIT});
        this.pongTransformFramebuffer = new Framebuffer({gl: gl, unit: PONG_TRANSFORM_UNIT});
    }

    gl() {
        return this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
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

    update(deltaTime) {
        const gl = this.gl();
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);
        gl.disable(gl.DEPTH_TEST);

        this.fullscreenVertexBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 2, 0, 0);

        if (this.changed) {
            this.initialSpectrumProgram.activate().
                uniform2f('u_wind', this.windX, this.windY).
                uniform1f('u_size', this.size);
            this.initialSpectrumFramebuffer.draw();
            this.changed = false;
        }
        
        //store phases separately to ensure continuity of waves during parameter editing
        this.phaseProgram.activate().
            uniform1i('u_phases', this.pingPhase ? PING_PHASE_UNIT : PONG_PHASE_UNIT).
            uniform1f('u_deltaTime', deltaTime).
            uniform1f('u_size', this.size);
        (this.pingPhase ? this.pongPhaseFramebuffer : this.pingPhaseFramebuffer).draw();

        this.spectrumProgram.activate().
            uniform1i('u_phases', this.pingPhase ? PONG_PHASE_UNIT : PING_PHASE_UNIT).
            uniform1f('u_size', this.size).
            uniform1f('u_choppiness', this.choppiness);
        this.spectrumFramebuffer.draw();

        //GPU FFT using Stockham formulation
        const iterations = log2(RESOLUTION);
        let subtransformProgram;
        for (let i = 0; i < 2 * iterations; i += 1) {
            if (i === 0) {
                subtransformProgram= this.horizontalSubtransformProgram.activate();
            }
            if (i == 0) {
                subtransformProgram.uniform1i('u_input', SPECTRUM_UNIT);
            } else if (i % 2 === 1) {
                subtransformProgram.uniform1i('u_input', PING_TRANSFORM_UNIT);
            } else {
                subtransformProgram.uniform1i('u_input', PONG_TRANSFORM_UNIT);
            }
            if (i === iterations) {
                subtransformProgram = this.verticalSubtransformProgram.activate();
            }
            subtransformProgram.uniform1f('u_subtransformSize', Math.pow(2, (i % iterations) + 1));
            if (i === 2 * iterations - 1) {
                this.displacementMapFramebuffer.draw();
            } else if (i % 2 === 1) {
                this.pongTransformFramebuffer.draw();
            } else {
                this.pingTransformFramebuffer.draw();
            }
        }
        this.pingPhase = !this.pingPhase;

        const normalMap = this.normalMapProgram.activate().
            uniform1f('u_size', this.size);
        this.normalMapFramebuffer.draw();
    }

    render(projectionMatrix, viewMatrix, cameraPosition) {
        const gl = this.gl();
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.oceanBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 3, 5 * SIZE_OF_FLOAT, 0);
        this.oceanProgram.activate().
            uniform1f('u_size', this.size).
            uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix).
            uniformMatrix4fv('u_viewMatrix', false, viewMatrix).
            uniform3fv('u_cameraPosition', cameraPosition);
        gl.drawElements(gl.TRIANGLES, this.oceanIndicesLength, gl.UNSIGNED_SHORT, 0);
    }

}
