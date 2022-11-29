"use strict";

class Simulator {
    

    constructor(canvas) {
        this.gl = canvas.getContext('webgl2');
        this.setWindSpeed(INITIAL_WIND_SPEED);
        this.setWindDirection(INITIAL_WIND_DIRECTION);
        this.setSize(INITIAL_SIZE);
        this.setChoppiness(INITIAL_CHOPPINESS);
        

        this.init();

        this.fullscreenBuffer = this.buffer(fullscreenData()).
            vertexAttribPointer(ATTR_POSITION, 2, this.gl.FLOAT, 0, 0);

        this.waveFramebuffer = this.framebuffer(waveArray(), 2);
        this.phaseFramebuffer = this.framebuffer(phaseArray(), 1);
        this.tmpPhaseFramebuffer = this.framebuffer(null, 1);
        this.initialSpectrumFramebuffer = this.framebuffer(null, 1);
        this.spectrumFramebuffer = this.framebuffer(null, 4, 2);
        this.tmpSpectrumFramebuffer = this.framebuffer(null, 4, 2);
        this.elevationFramebuffer = this.framebuffer();
        this.outputFramebuffer = this.framebuffer(null, 4, 1, OUTPUT_SIZE);

        this.initialSpectrumProgram = this.program('initial_spectrum').
            uniform1i('u_wave', this.waveFramebuffer.unit[0]);
        this.phaseProgram = this.program('phase').
            uniform1i('u_wave', this.waveFramebuffer.unit[0]);
        this.spectrumProgram = this.program('spectrum').
            uniform1i('u_initialSpectrum', this.initialSpectrumFramebuffer.unit[0]).
            uniform1i('u_wave', this.waveFramebuffer.unit[0]);
        this.fftProgram = this.program('fft');
        this.elevationProgram = this.program('elevation').
            uniform1i('u_fluctuation', this.spectrumFramebuffer.unit[0]);

        this.oceanBuffer = this.buffer(oceanData()).
            vertexAttribPointer(ATTR_COORDINATES, 2, this.gl.FLOAT, 0, 0).
            addIndex(oceanIndices());

        this.oceanProgram = this.program('ocean').
            uniform1i('u_elevation', this.elevationFramebuffer.unit[0]).
            uniform3f('u_oceanColor', OCEAN_COLOR).
            uniform3f('u_skyColor', SKY_COLOR).
            uniform3f('u_sunDirection', SUN_DIRECTION);
        this.grayscaleProgram = this.program('grayscale').
            uniform1i('u_elevation', this.elevationFramebuffer.unit[0])
        this.outputProgram = this.program('output').
            uniform1i('u_elevation', this.elevationFramebuffer.unit[0])


    }

    init() {
        const gl = this.gl;
        gl.getExtension('EXT_color_buffer_float');
        gl.getExtension('OES_texture_float_linear');
    }

    update(deltaTime) {
        const gl = this.gl;
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);

        this.fullscreenBuffer.bind();

        if (this.changed) {
            const spd = this.wind_speed;
            const dir = (Math.PI / 180) * this.wind_direction;
            const wind = [spd * Math.cos(dir), spd * Math.sin(dir)];
            this.initialSpectrumProgram.activate().
                uniform1f('u_size', this.size).
                uniform2f('u_wind', wind);
            this.initialSpectrumFramebuffer.draw();
            this.changed = false;
        }

        this.phaseProgram.activate().
            uniform1i('u_phases', this.phaseFramebuffer.unit[0]).
            uniform1f('u_size', this.size).
            uniform1f('u_deltaTime', deltaTime);
        this.tmpPhaseFramebuffer.draw();
        [this.phaseFramebuffer, this.tmpPhaseFramebuffer] = [this.tmpPhaseFramebuffer, this.phaseFramebuffer];

        this.spectrumProgram.activate().
            uniform1i('u_phases', this.phaseFramebuffer.unit[0]).
            uniform1f('u_size', this.size).
            uniform1f('u_choppiness', this.choppiness);
        this.spectrumFramebuffer.draw();

        let buffer1 = this.spectrumFramebuffer;
        let buffer2 = this.tmpSpectrumFramebuffer;
        this.fftProgram.activate();
        for (let mode in [0, 1]) {
            this.fftProgram.uniform1i('u_direction', mode);
            for (let i = 2; i <= RESOLUTION; i *= 2) {
                this.fftProgram.
                    uniform1i('u_real', buffer1.unit[0]).
                    uniform1i('u_imag', buffer1.unit[1]).
                    uniform1i('u_subtransformSize', i);
                buffer2.draw();
                [buffer1, buffer2] = [buffer2, buffer1];
            }
        }

        this.elevationProgram.activate().
            uniform1f('u_size', this.size);
        this.elevationFramebuffer.draw();
    }

    render(viewMatrix, cameraPosition) {
        const projectionMatrix = m4.perspective(FOV, this.gl.canvas.width / this.gl.canvas.height, NEAR, FAR);
        const gl = this.gl;
        this.resize(window.innerWidth, window.innerHeight)
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor.apply(gl, CLEAR_COLOR)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.oceanProgram.activate().
            uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix).
            uniformMatrix4fv('u_viewMatrix', false, viewMatrix).
            uniform3fv('u_cameraPosition', cameraPosition);
        this.oceanBuffer.draw();
    }

    render_grayscale(viewMatrix) {
        const projectionMatrix = m4.perspective(OUTPUT_FOV, 1, NEAR, FAR);
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor.apply(gl, GRAYSCALE_CLEAR_COLOR)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, RESOLUTION, RESOLUTION);
        this.grayscaleProgram.activate()
            .uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix)
            .uniformMatrix4fv('u_viewMatrix', false, viewMatrix)
        this.oceanBuffer.draw();
    }

    output(viewMatrix) {
        this.resize(OUTPUT_SIZE, OUTPUT_SIZE);
        const projectionMatrix = m4.perspective(OUTPUT_FOV, 1, NEAR, FAR);
        const gl = this.gl;
        this.outputFramebuffer.activate();
        gl.enable(gl.DEPTH_TEST);
        gl.clearColor.apply(gl, OUTPUT_CLEAR_COLOR)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        this.outputProgram.activate()
            .uniformMatrix4fv('u_projectionMatrix', false, projectionMatrix)
            .uniformMatrix4fv('u_viewMatrix', false, viewMatrix)
        this.oceanBuffer.draw();
        var pixels = new Float32Array(OUTPUT_SIZE * OUTPUT_SIZE * 4);
        gl.readPixels(0, 0, OUTPUT_SIZE, OUTPUT_SIZE, gl.RGBA, gl.FLOAT, pixels);
        const x = tf.tensor1d(pixels).reshape([1, OUTPUT_SIZE, OUTPUT_SIZE, 4]).gather([0,1,2],3);
        //console.log(x)
        //x.print()
        // async function run(){
        //     const y = this.model.predict(x); 
        //     return y
        // }
        // const y=run(x)
        //y.print()
        this.outputFramebuffer.inactivate();
        this.resize(window.innerWidth, window.innerHeight)
        return pixels
    }

    resize(width, height) {
        this.gl.canvas.width = width;
        this.gl.canvas.height = height;
    }

    setWindSpeed(val) {
        this.wind_speed = val;
        this.changed = true;
    }

    setWindDirection(val) {
        this.wind_direction = val;
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

    static vert_src = {};
    static src = {};

    static async load_gl() {
        const vert_names = ['square', 'surface'];
        for (let name of vert_names) {
            Simulator.vert_src[name] = await fetch('./gl/' + name + '.vert').then(res => res.text());
        }
        for (let name of ['initial_spectrum', 'phase', 'spectrum', 'fft', 'elevation']) {
            Simulator.src[name] = [
                Simulator.vert_src['square'],
                await fetch('./gl/' + name + '.frag').then(res => res.text()),
            ];
        }
        for (let name of ['ocean', 'grayscale', 'output']) {
            Simulator.src[name] = [
                Simulator.vert_src['surface'],
                await fetch('./gl/' + name + '.frag').then(res => res.text()),
            ];
        }
    }

}
