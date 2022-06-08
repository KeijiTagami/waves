#version 300 es
precision highp float;

const float PI = 3.14159265359;

uniform sampler2D u_real;
uniform sampler2D u_imag;
uniform int u_direction;
uniform int u_subtransformSize;

layout (location = 0) out vec4 real;
layout (location = 1) out vec4 imag;

int modifyIndex(int ind) {
    int hsize = u_subtransformSize / 2;
    int r = (ind / u_subtransformSize) * hsize;
    int m = ind - (ind / hsize) * hsize;
    return r + m;
}

void main(void) {
    int res = textureSize(u_real, 0).x;
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    if (u_direction == 1) {
        ind = ind.yx;
    }

    ivec2 m = ivec2(modifyIndex(ind.x), ind.y);
    ivec2 n = ivec2(m.x + res / 2, m.y);
    if (u_direction == 1) {
        m = m.yx;
        n = n.yx;
    }

    vec4 even_real = texelFetch(u_real, m, 0);
    vec4 even_imag = texelFetch(u_imag, m, 0);
    vec4 odd_real = texelFetch(u_real, n, 0);
    vec4 odd_imag = texelFetch(u_imag, n, 0);

    float twiddle = -2.0 * PI * float(ind.x) / float(u_subtransformSize);
    float a = cos(twiddle);
    float b = sin(twiddle);
    real = even_real + a * odd_real - b * odd_imag;
    imag = even_imag + b * odd_real + a * odd_imag;
}
