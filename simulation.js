class Simulator {

    constructor(canvas, width, height) {
        const gl = canvas.getContext('webgl2');

        this.gl = gl;
        this.resize(width, height);
        this.setWind(INITIAL_WIND[0], INITIAL_WIND[1]);
        this.setSize(INITIAL_SIZE);
        this.setChoppiness(INITIAL_CHOPPINESS);

        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');
        gl.clearColor.apply(gl, CLEAR_COLOR);

        this.fullscreenBuffer = new Buffer(gl, fullscreenData()).
            vertexAttribPointer(ATTR_POSITION, 2, 0, 0);

        this.inputPhaseFramebuffer = this.framebuffer(phaseArray(), 1);
        this.outputPhaseFramebuffer = this.framebuffer(null, 1);
        this.initialSpectrumFramebuffer = this.framebuffer(null, 1);
        this.spectrumFramebuffer = this.framebuffer();
        this.displacementMapFramebuffer = this.framebuffer();

        this.initialSpectrumProgram = this.program('init').
            uniform1f('u_resolution', RESOLUTION);
        this.phaseProgram = this.program('phase');
            // inputPhase
        this.spectrumProgram = this.program('spectrum').
            uniform1i('u_initialSpectrum', this.initialSpectrumFramebuffer.unit);
            // outputPhase
        this.subtransformProgram = this.program('fft');
            // spectrum

        this.oceanBuffer = new Buffer(gl, oceanData()).
            vertexAttribPointer(ATTR_COORDINATES, 2, 0, 0).
            addIndex(oceanIndices());
        this.oceanProgram = this.program('ocean').
            // displacementMap
            uniform1f('u_geometrySize', GEOMETRY_SIZE).
            uniform3f('u_oceanColor', OCEAN_COLOR[0], OCEAN_COLOR[1], OCEAN_COLOR[2]).
            uniform3f('u_skyColor', SKY_COLOR[0], SKY_COLOR[1], SKY_COLOR[2]).
            uniform3f('u_sunDirection', SUN_DIRECTION[0], SUN_DIRECTION[1], SUN_DIRECTION[2]).
            uniform1f('u_exposure', EXPOSURE);
    }

    update(deltaTime) {
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);

        this.fullscreenBuffer.bind();

        if (this.changed) {
            this.initialSpectrumProgram.activate().
                uniform1f('u_size', this.size).
                uniform2f('u_wind', this.windX, this.windY);
            this.initialSpectrumFramebuffer.draw();
            this.changed = false;
        }

        this.phaseProgram.activate().
            uniform1i('u_phases', this.inputPhaseFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniform1f('u_deltaTime', deltaTime);
        this.outputPhaseFramebuffer.draw();

        this.spectrumProgram.activate().
            uniform1i('u_phases', this.outputPhaseFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniform1f('u_choppiness', this.choppiness);
        this.spectrumFramebuffer.draw();

        let output = this.spectrumFramebuffer;
        let input = this.displacementMapFramebuffer;
        this.subtransformProgram.activate();
        for (let mode in [0, 1]) {
            this.subtransformProgram.uniform1i('u_direction', mode);
            for (let i = 2; i <= RESOLUTION; i *= 2) {
                [input, output] = [output, input];
                this.subtransformProgram.
                    uniform1i('u_input', input.unit).
                    uniform1i('u_subtransformSize', i);
                output.draw();
            }
        }

        [this.inputPhaseFramebuffer, this.outputPhaseFramebuffer] = [this.outputPhaseFramebuffer, this.inputPhaseFramebuffer];
        [this.spectrumFramebuffer, this.displacementMapFramebuffer] = [input, output];
    }

    render(projectionMatrix, viewMatrix, cameraPosition) {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.oceanProgram.activate().
            uniform1i('u_displacementMap', this.displacementMapFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix).
            uniformMatrix4fv('u_viewMatrix', false, viewMatrix).
            uniform3fv('u_cameraPosition', cameraPosition);
        this.oceanBuffer.draw();
    }

    resize(width, height) {
        this.gl.canvas.width = width;
        this.gl.canvas.height = height;
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

    framebuffer(...args) {
        return new Framebuffer(this.gl, ...args);
    }

    program(name) {
        const programs = {
            'init': [Simulator.FULLSCREEN_VERTEX_SOURCE, Simulator.INITIAL_SPECTRUM_FRAGMENT_SOURCE],
            'phase': [Simulator.FULLSCREEN_VERTEX_SOURCE, Simulator.PHASE_FRAGMENT_SOURCE],
            'spectrum': [Simulator.FULLSCREEN_VERTEX_SOURCE, Simulator.SPECTRUM_FRAGMENT_SOURCE],
            'fft': [Simulator.FULLSCREEN_VERTEX_SOURCE, Simulator.SUBTRANSFORM_FRAGMENT_SOURCE],
            'ocean': [Simulator.OCEAN_VERTEX_SOURCE, Simulator.OCEAN_FRAGMENT_SOURCE],
        };
        const src = programs[name];
        return new Program(this.gl, src[0], src[1]);
    }

    static FULLSCREEN_VERTEX_SOURCE;
    static INITIAL_SPECTRUM_FRAGMENT_SOURCE;
    static PHASE_FRAGMENT_SOURCE;
    static SPECTRUM_FRAGMENT_SOURCE;
    static SUBTRANSFORM_FRAGMENT_SOURCE;
    static OCEAN_VERTEX_SOURCE;
    static OCEAN_FRAGMENT_SOURCE;

    static async load_gl() {
        Simulator.FULLSCREEN_VERTEX_SOURCE = await fetch('./gl/fullscreen.vert').then(res => res.text());
        Simulator.INITIAL_SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/initial_spectrum.frag').then(res => res.text());
        Simulator.PHASE_FRAGMENT_SOURCE = await fetch('./gl/phase.frag').then(res => res.text());
        Simulator.SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/spectrum.frag').then(res => res.text());
        Simulator.SUBTRANSFORM_FRAGMENT_SOURCE = await fetch('./gl/subtransform.frag').then(res => res.text());
        Simulator.OCEAN_VERTEX_SOURCE = await fetch('./gl/ocean.vert').then(res => res.text());
        Simulator.OCEAN_FRAGMENT_SOURCE = await fetch('./gl/ocean.frag').then(res => res.text());
    }

}
