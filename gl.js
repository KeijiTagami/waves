importScripts("./m4.js")

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

    vertexAttribPointer(index, size, type, stride, offset) {
        const gl = this.gl
        gl.enableVertexAttribArray(index);
        let type_size;
        let func;
        if (type == gl.FLOAT) {
            type_size = 4;
        } else if (type == gl.INT) {
            type_size = 4;
        } else if (type == gl.SHORT) {
            type_size = 2;
        }
        if (type == gl.FLOAT) {
            gl.vertexAttribPointer(index, size, type, false, stride * type_size, offset * type_size);
        } else {
            gl.vertexAttribIPointer(index, size, type, stride * type_size, offset * type_size);
        }
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
        gl.drawElements(gl.TRIANGLES, this.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

}

class Framebuffer {

    static curr_unit = 0;

    constructor(gl, data=null, size=4, count=1, width=RESOLUTION, height=RESOLUTION) {
        let internalformat;
        let format;
        if (size == 4) {
            internalformat = gl.RGBA32F;
            format = gl.RGBA;
        } else if (size == 2) {
            internalformat = gl.RG32F;
            format = gl.RG;
        } else if (size == 1) {
            internalformat = gl.R32F;
            format = gl.RED;
        }
        const unit = [];
        const textures = [];
        for (let i = 0; i < count; i += 1) {
            gl.activeTexture(gl.TEXTURE0 + Framebuffer.curr_unit);
            unit.push(Framebuffer.curr_unit);
            Framebuffer.curr_unit += 1;
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, width, height, 0, format, gl.FLOAT, data);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            textures.push(texture);
        }
        this.gl = gl;
        this.unit = unit;
        this.textures = textures;
    }

    activate() {
        const gl = this.gl
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        const attach = [];
        for (let i = 0; i < this.unit.length; i += 1) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, this.textures[i], 0);
            attach.push(gl.COLOR_ATTACHMENT0 + i);
        }
        gl.drawBuffers(attach);
    }

    inactivate() {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    draw() {
        const gl = this.gl
        this.activate()
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        this.inactivate()
    }

}

class Program {

    static vertex_shader_dict = {};

    constructor(gl, vertexSource, fragmentSource) {
        const program = gl.createProgram();

        if (Program.vertex_shader_dict[vertexSource] === undefined) {
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexSource);
            gl.compileShader(vertexShader);
            Program.vertex_shader_dict[vertexSource] = vertexShader;
        }
        gl.attachShader(program, Program.vertex_shader_dict[vertexSource]);

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

    uniform2f(name, val) {
        this.gl.uniform2f(this.uniformLocations[name], val[0], val[1]);
        return this;
    }

    uniform3f(name, val) {
        this.gl.uniform3f(this.uniformLocations[name], val[0], val[1], val[2]);
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
