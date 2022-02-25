#version 300 es
precision highp float;

const float PI = 3.14159265359;

uniform float u_resolution;

uniform sampler2D u_input;
uniform float u_direction;
uniform float u_subtransformSize;

out vec4 outColor;

vec2 trans(vec2 orig) {
    float u = 1.0 - u_direction;
    float v = u_direction;
    return vec2(orig.x * u + orig.y * v, orig.x * v + orig.y * u);
}

vec2 multiplyComplex (vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

float toIndex(float x) {
    return u_resolution * x - 0.5;
}

float toCoord(float idx) {
    return (idx + 0.5) / u_resolution;
}

float modifyIndex(float idx) {
    float hsize = 0.5 * u_subtransformSize;
    return floor(idx / u_subtransformSize) * hsize + mod(idx, hsize);
}

void main (void) {
    vec2 coord = trans(gl_FragCoord.xy / u_resolution);

    float idx = toIndex(coord.x);
    vec2 m = vec2(toCoord(modifyIndex(idx)), coord.y);
    vec2 n = vec2(m.x + 0.5, m.y);
    vec4 even = texture(u_input, trans(m));
    vec4 odd = texture(u_input, trans(n));

    float twiddleArgument = -2.0 * PI * idx / u_subtransformSize;
    vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    vec2 out1 = even.xy + multiplyComplex(twiddle, odd.xy);
    vec2 out2 = even.zw + multiplyComplex(twiddle, odd.zw);
    outColor = vec4(out1, out2);
}
