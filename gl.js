let FULLSCREEN_VERTEX_SOURCE;
let INITIAL_SPECTRUM_FRAGMENT_SOURCE;
let PHASE_FRAGMENT_SOURCE;
let SPECTRUM_FRAGMENT_SOURCE;
let SUBTRANSFORM_FRAGMENT_SOURCE;
let OCEAN_VERTEX_SOURCE;
let OCEAN_FRAGMENT_SOURCE;

async function load_gl() {
    FULLSCREEN_VERTEX_SOURCE = await fetch('./gl/fullscreen.vert').then(res => res.text());
    INITIAL_SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/initial_spectrum.frag').then(res => res.text());
    PHASE_FRAGMENT_SOURCE = await fetch('./gl/phase.frag').then(res => res.text());
    SPECTRUM_FRAGMENT_SOURCE = await fetch('./gl/spectrum.frag').then(res => res.text());
    SUBTRANSFORM_FRAGMENT_SOURCE = await fetch('./gl/subtransform.frag').then(res => res.text());
    OCEAN_VERTEX_SOURCE = await fetch('./gl/ocean.vert').then(res => res.text());
    OCEAN_FRAGMENT_SOURCE = await fetch('./gl/ocean.frag').then(res => res.text());
}

class Buffer {

    constructor(gl, data) {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.gl = gl;
        this.vao = vao;
    }

    vertexAttribPointer(index, size, stride, offset) {
        const gl = this.gl
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride * SIZE_OF_FLOAT, offset * SIZE_OF_FLOAT);
        return this;
    }

    addIndex(data) {
        const gl = this.gl
        const index = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
        this.index = index;
        this.length = data.length;
        return this;
    }

    bind() {
        const gl = this.gl
        gl.bindVertexArray(this.vao);
    }

    draw() {
        const gl = this.gl
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index);
        gl.drawElements(gl.TRIANGLE_STRIP, this.length, gl.UNSIGNED_SHORT, 0);
    }

}

let curr_unit = 0;

class Framebuffer {

    constructor(gl, data=null) {
        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + curr_unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, RESOLUTION, RESOLUTION, 0, gl.RGBA, gl.FLOAT, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        this.gl = gl;
        this.unit = curr_unit;
        this.framebuffer = framebuffer;
        curr_unit += 1;
    }

    draw() {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

}

const vertex_shader_dict = {};

class Program {

    constructor(gl, vertexSource, fragmentSource) {
        const program = gl.createProgram();

        if (vertex_shader_dict[vertexSource] === undefined) {
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexSource);
            gl.compileShader(vertexShader);
            vertex_shader_dict[vertexSource] = vertexShader;
        }
        gl.attachShader(program, vertex_shader_dict[vertexSource]);

        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const uniformLocations = {};
        const numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numberOfUniforms; i += 1) {
            const activeUniform = gl.getActiveUniform(program, i);
            const uniformLocation = gl.getUniformLocation(program, activeUniform.name);
            uniformLocations[activeUniform.name] = uniformLocation;
        }

        this.gl = gl;
        this.program = program;
        this.uniformLocations = uniformLocations;
        this.activate();
    }

    activate() {
        this.gl.useProgram(this.program);
        return this;
    }

    uniform1i(name, val) {
        this.gl.uniform1i(this.uniformLocations[name], val);
        return this;
    }

    uniform1f(name, val) {
        this.gl.uniform1f(this.uniformLocations[name], val);
        return this;
    }

    uniform2f(name, v1, v2) {
        this.gl.uniform2f(this.uniformLocations[name], v1, v2);
        return this;
    }

    uniform3f(name, v1, v2, v3) {
        this.gl.uniform3f(this.uniformLocations[name], v1, v2, v3);
        return this;
    }

    uniform3fv(name, val) {
        this.gl.uniform3fv(this.uniformLocations[name], val);
        return this;
    }

    uniformMatrix4fv(name, flag, val) {
        this.gl.uniformMatrix4fv(this.uniformLocations[name], flag, val);
        return this;
    }

}

class FullscreenProgram extends Program {
    constructor(gl, src) {
        super(gl, FULLSCREEN_VERTEX_SOURCE, src);
    }
}

class OceanProgram extends Program {
    constructor(gl) {
        super(gl, OCEAN_VERTEX_SOURCE, OCEAN_FRAGMENT_SOURCE);
    }
}
