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

    constructor(gl, data) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.gl = gl;
        this.buffer = buffer;
    }

    vertexAttribPointer(index, size, stride, offset) {
        const gl = this.gl
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride * SIZE_OF_FLOAT, offset * SIZE_OF_FLOAT);
        return this;
    }

}

class ElementsBuffer {

    constructor(gl, data) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.gl = gl;
        this.length = data.length;
    }

    draw() {
        const gl = this.gl
        gl.drawElements(gl.TRIANGLES, this.length, gl.UNSIGNED_SHORT, 0);
    }

}

class Framebuffer {

    constructor({gl, unit, data=null, wrap=gl.CLAMP_TO_EDGE, filter=gl.NEAREST}) {
        this.gl = gl;
        this.unit = unit;
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

function swap(a, b) {
    [a, b] = [b, a];
}

class Simulator {

    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.resize(width, height);
        this.setWind(INITIAL_WIND[0], INITIAL_WIND[1]);
        this.setSize(INITIAL_SIZE);
        this.setChoppiness(INITIAL_CHOPPINESS);

        const gl = this.gl();
        gl.getExtension('OES_texture_float');
        gl.getExtension('OES_texture_float_linear');
        gl.clearColor.apply(gl, CLEAR_COLOR);
        gl.enableVertexAttribArray(FULLSCREEN_COORDINATES_UNIT);
        gl.enableVertexAttribArray(OCEAN_COORDINATES_UNIT);

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
            uniform1f('u_resolution', RESOLUTION);
        this.oceanProgram = new OceanProgram(gl).
            uniform1i('u_normalMap', NORMAL_MAP_UNIT).
            uniform1f('u_geometrySize', GEOMETRY_SIZE).
            uniform3f('u_oceanColor', OCEAN_COLOR[0], OCEAN_COLOR[1], OCEAN_COLOR[2]).
            uniform3f('u_skyColor', SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]).
            uniform3f('u_sunDirection', SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]).
            uniform1f('u_exposure', EXPOSURE);

        this.fullscreenBuffer = new Buffer(gl, fullscreenData());
        this.oceanBuffer = new Buffer(gl, oceanData());
        this.oceanElements = new ElementsBuffer(gl, oceanIndices());

        /* switch in update and render
        this.fullscreenBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 2, 0, 0);
        this.oceanBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 3, 5, 0);
        */
        this.oceanBuffer.
            vertexAttribPointer(OCEAN_COORDINATES_UNIT, 2, 5, 3);

        this.initialSpectrumFramebuffer = new Framebuffer({gl: gl, unit: INITIAL_SPECTRUM_UNIT, wrap: gl.REPEAT});
        this.inputPhaseFramebuffer = new Framebuffer({gl: gl, unit: PHASE1_UNIT, data: phaseArray()});
        this.outputPhaseFramebuffer = new Framebuffer({gl: gl, unit: PHASE2_UNIT});
        this.spectrumFramebuffer = new Framebuffer({gl: gl, unit: SPECTRUM_UNIT});
        this.displacementMapFramebuffer = new Framebuffer({gl: gl, unit: DISPLACEMENT_MAP_UNIT});
        this.normalMapFramebuffer = new Framebuffer({gl: gl, unit: NORMAL_MAP_UNIT, filter: gl.LINEAR});
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
        gl.disable(gl.DEPTH_TEST);

        this.fullscreenBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 2, 0, 0);
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);

        if (this.changed) {
            this.initialSpectrumProgram.activate().
                uniform2f('u_wind', this.windX, this.windY).
                uniform1f('u_size', this.size);
            this.initialSpectrumFramebuffer.draw();
            this.changed = false;
        }

        this.phaseProgram.activate().
            uniform1i('u_phases', this.inputPhaseFramebuffer.unit).
            uniform1f('u_deltaTime', deltaTime).
            uniform1f('u_size', this.size);
        this.outputPhaseFramebuffer.draw();
        swap(this.inputPhaseFramebuffer, this.outputPhaseFramebuffer);

        this.spectrumProgram.activate().
            uniform1i('u_phases', this.outputPhaseFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniform1f('u_choppiness', this.choppiness);
        this.spectrumFramebuffer.draw();

        //GPU FFT using Stockham formulation
        const iterations = log2(RESOLUTION);
        let subtransformProgram;
        let output = this.spectrumFramebuffer;
        let input = this.displacementMapFramebuffer;
        subtransformProgram = this.horizontalSubtransformProgram.activate();
        for (let i = 0; i < iterations; i += 1) {
            [input, output] = [output, input];
            subtransformProgram.
                uniform1i('u_input', input.unit).
                uniform1f('u_subtransformSize', Math.pow(2, i + 1));
            output.draw();
        }
        subtransformProgram = this.verticalSubtransformProgram.activate();
        for (let i = 0; i < iterations; i += 1) {
            [input, output] = [output, input];
            subtransformProgram.
                uniform1i('u_input', input.unit).
                uniform1f('u_subtransformSize', Math.pow(2, i + 1));
            output.draw();
        }

        const normalMap = this.normalMapProgram.activate().
            uniform1i('u_displacementMap', output.unit).
            uniform1f('u_size', this.size);
        this.normalMapFramebuffer.draw();

        [this.inputPhaseFramebuffer, this.outputPhaseFramebuffer] = [this.outputPhaseFramebuffer, this.inputPhaseFramebuffer];
        [this.spectrumFramebuffer, this.displacementMapFramebuffer] = [input, output];
    }

    render(projectionMatrix, viewMatrix, cameraPosition) {
        const gl = this.gl();
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this.oceanBuffer.
            vertexAttribPointer(FULLSCREEN_COORDINATES_UNIT, 3, 5, 0);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.oceanProgram.activate().
            uniform1i('u_displacementMap', this.displacementMapFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix).
            uniformMatrix4fv('u_viewMatrix', false, viewMatrix).
            uniform3fv('u_cameraPosition', cameraPosition);
        this.oceanElements.draw();
    }

}
