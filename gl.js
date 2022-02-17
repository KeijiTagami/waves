class Program {

    constructor(gl, vertexShader, fragmentShader, attributeLocations) {
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        for (var attributeName in attributeLocations) {
            gl.bindAttribLocation(program, attributeLocations[attributeName], attributeName);
        }
        gl.linkProgram(program);
        var uniformLocations = {};
        var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (var i = 0; i < numberOfUniforms; i += 1) {
            var activeUniform = gl.getActiveUniform(program, i),
                uniformLocation = gl.getUniformLocation(program, activeUniform.name);
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

var buildShader = function (gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
};

var buildTexture = function (gl, unit, format, type, width, height, data, wrapS, wrapT, minFilter, magFilter) {
    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    return texture;
};

var buildFramebuffer = function (gl, attachment) {
    var framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, attachment, 0);
    return framebuffer;
};

var hasWebGLSupportWithExtensions = function (extensions) {
    var canvas = document.createElement('canvas');
    var gl = null;
    try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) {
        return false;
    }
    if (gl === null) {
        return false;
    }

    for (var i = 0; i < extensions.length; ++i) {
        if (gl.getExtension(extensions[i]) === null) {
            return false
        }
    }

    return true;
};
