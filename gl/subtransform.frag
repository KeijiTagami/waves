#version 300 es
precision highp float;

const float PI = 3.14159265359;

uniform sampler2D u_input;
uniform int u_direction;
uniform int u_subtransformSize;

out vec4 dispatch;

vec2 multiplyComplex (vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

int modifyIndex(int ind) {
    int hsize = u_subtransformSize / 2;
    int r = (ind / u_subtransformSize) * hsize;
    int m = ind - (ind / hsize) * hsize;
    return r + m;
}

void main (void) {
    int res = textureSize(u_input, 0).x;
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
    vec4 even = texelFetch(u_input, m, 0);
    vec4 odd = texelFetch(u_input, n, 0);

    float twiddleArgument = -2.0 * PI * float(ind.x) / float(u_subtransformSize);
    vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    vec2 out1 = even.xy + multiplyComplex(twiddle, odd.xy);
    vec2 out2 = even.zw + multiplyComplex(twiddle, odd.zw);
    dispatch = vec4(out1, out2);
}
