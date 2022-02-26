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

        this.initialSpectrumProgram = new FullscreenProgram(gl, INITIAL_SPECTRUM_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.initialSpectrumFramebuffer = new Framebuffer({gl: gl, unit: INITIAL_SPECTRUM_UNIT});

        this.inputPhaseFramebuffer = new Framebuffer({gl: gl, unit: PHASE1_UNIT, data: phaseArray()});
        this.phaseProgram = new FullscreenProgram(gl, PHASE_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.outputPhaseFramebuffer = new Framebuffer({gl: gl, unit: PHASE2_UNIT});
        this.spectrumProgram = new FullscreenProgram(gl, SPECTRUM_FRAGMENT_SOURCE).
            uniform1i('u_initialSpectrum', INITIAL_SPECTRUM_UNIT).
            uniform1f('u_resolution', RESOLUTION);
        this.spectrumFramebuffer = new Framebuffer({gl: gl, unit: SPECTRUM_UNIT});
        this.subtransformProgram = new FullscreenProgram(gl, SUBTRANSFORM_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.displacementMapFramebuffer = new Framebuffer({gl: gl, unit: DISPLACEMENT_MAP_UNIT});
        this.normalMapProgram = new FullscreenProgram(gl, NORMAL_MAP_FRAGMENT_SOURCE).
            uniform1f('u_resolution', RESOLUTION);
        this.normalMapFramebuffer = new Framebuffer({gl: gl, unit: NORMAL_MAP_UNIT, filter: gl.LINEAR});

        this.oceanBuffer = new Buffer(gl, oceanData()).
            vertexAttribPointer(ATTR_COORDINATES, 2, 0, 0).
            addIndex(oceanIndices());
        this.oceanProgram = new OceanProgram(gl).
            uniform1i('u_normalMap', NORMAL_MAP_UNIT).
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

        this.subtransformProgram.activate();
        const iterations = log2(RESOLUTION);
        let output = this.spectrumFramebuffer;
        let input = this.displacementMapFramebuffer;
        this.subtransformProgram.
            uniform1f('u_direction', 0.0);
        for (let i = 0; i < iterations; i += 1) {
            [input, output] = [output, input];
            this.subtransformProgram.
                uniform1i('u_input', input.unit).
                uniform1f('u_subtransformSize', Math.pow(2, i + 1));
            output.draw();
        }
        this.subtransformProgram.
            uniform1f('u_direction', 1.0);
        for (let i = 0; i < iterations; i += 1) {
            [input, output] = [output, input];
            this.subtransformProgram.
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

}
