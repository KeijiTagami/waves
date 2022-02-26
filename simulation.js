class Simulator {

    constructor(canvas, width, height) {
        this.gl = canvas.getContext('webgl2');
        this.init();

        this.resize(width, height);
        this.setWind(INITIAL_WIND);
        this.setSize(INITIAL_SIZE);
        this.setChoppiness(INITIAL_CHOPPINESS);

        this.fullscreenBuffer = this.buffer(fullscreenData()).
            vertexAttribPointer(ATTR_POSITION, 2, this.gl.FLOAT, 0, 0);

        this.waveFramebuffer = this.framebuffer(waveArray(), 2);
        this.phaseFramebuffer = this.framebuffer(phaseArray(), 1);
        this.tmpPhaseFramebuffer = this.framebuffer(null, 1);
        this.initialSpectrumFramebuffer = this.framebuffer(null, 1);
        this.spectrumFramebuffer = this.framebuffer();
        this.displacementMapFramebuffer = this.framebuffer();

        this.initialSpectrumProgram = this.program('initial_spectrum').
            uniform1i('u_wave', this.waveFramebuffer.unit);
        this.phaseProgram = this.program('phase').
            // phase
            uniform1i('u_wave', this.waveFramebuffer.unit);
        this.spectrumProgram = this.program('spectrum').
            uniform1i('u_initialSpectrum', this.initialSpectrumFramebuffer.unit).
            // phase
            uniform1i('u_wave', this.waveFramebuffer.unit);
        this.fftProgram = this.program('fft');
            // spectrum

        this.oceanBuffer = this.buffer(oceanData()).
            vertexAttribPointer(ATTR_COORDINATES, 2, this.gl.SHORT, 0, 0).
            addIndex(oceanIndices());
        this.oceanProgram = this.program('ocean').
            // displacementMap
            uniform1f('u_geometrySize', GEOMETRY_SIZE).
            uniform3f('u_oceanColor', OCEAN_COLOR).
            uniform3f('u_skyColor', SKY_COLOR).
            uniform3f('u_sunDirection', SUN_DIRECTION).
            uniform1f('u_exposure', EXPOSURE);
    }

    init() {
        const gl = this.gl;
        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');
        gl.clearColor.apply(gl, CLEAR_COLOR);
    }

    update(deltaTime) {
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);

        this.fullscreenBuffer.bind();

        if (this.changed) {
            this.initialSpectrumProgram.activate().
                uniform1f('u_size', this.size).
                uniform2f('u_wind', this.wind);
            this.initialSpectrumFramebuffer.draw();
            this.changed = false;
        }

        this.phaseProgram.activate().
            uniform1i('u_phases', this.phaseFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniform1f('u_deltaTime', deltaTime);
        this.tmpPhaseFramebuffer.draw();
        [this.phaseFramebuffer, this.tmpPhaseFramebuffer] = [this.tmpPhaseFramebuffer, this.phaseFramebuffer];

        this.spectrumProgram.activate().
            uniform1i('u_phases', this.phaseFramebuffer.unit).
            uniform1f('u_size', this.size).
            uniform1f('u_choppiness', this.choppiness);
        this.spectrumFramebuffer.draw();

        let buffer1 = this.spectrumFramebuffer;
        let buffer2 = this.displacementMapFramebuffer;
        this.fftProgram.activate();
        for (let mode in [0, 1]) {
            this.fftProgram.uniform1i('u_direction', mode);
            for (let i = 2; i <= RESOLUTION; i *= 2) {
                this.fftProgram.
                    uniform1i('u_input', buffer1.unit).
                    uniform1i('u_subtransformSize', i);
                buffer2.draw();
                [buffer1, buffer2] = [buffer2, buffer1];
            }
        }
        [this.spectrumFramebuffer, this.displacementMapFramebuffer] = [buffer2, buffer1];
    }

    render(projectionMatrix, viewMatrix, cameraPosition) {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

        this.oceanProgram.activate().
            uniform1i('u_displacementMap', this.displacementMapFramebuffer.unit).
            uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix).
            uniformMatrix4fv('u_viewMatrix', false, viewMatrix).
            uniform3fv('u_cameraPosition', cameraPosition);
        this.oceanBuffer.draw();
    }

    resize(width, height) {
        this.gl.canvas.width = width;
        this.gl.canvas.height = height;
    }

    setWind(wind) {
        this.wind = wind;
        this.changed = true;
    }

    setSize(newSize) {
        this.size = newSize;
        this.changed = true;
    }

    setChoppiness(newChoppiness) {
        this.choppiness = newChoppiness;
    }

    buffer(...args) {
        return new Buffer(this.gl, ...args);
    }

    framebuffer(...args) {
        return new Framebuffer(this.gl, ...args);
    }

    program(name) {
        const src = Simulator.src[name];
        return new Program(this.gl, src[0], src[1]);
    }

    static src = {};

    static async load_gl() {
        const vert_names = ['square', 'surface'];
        for (let name of vert_names) {
            Simulator.src[name] = await fetch('./gl/' + name + '.vert').then(res => res.text());
        }
        for (let name of ['initial_spectrum', 'phase', 'spectrum', 'fft']) {
            Simulator.src[name] = [
                Simulator.src['square'],
                await fetch('./gl/' + name + '.frag').then(res => res.text()),
            ];
        }
        for (let name of ['ocean']) {
            Simulator.src[name] = [
                Simulator.src['surface'],
                await fetch('./gl/' + name + '.frag').then(res => res.text()),
            ];
        }
    }

}
