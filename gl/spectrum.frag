#version 300 es
precision highp float;

uniform sampler2D u_initialSpectrum;
uniform sampler2D u_phases;
uniform sampler2D u_wave;

uniform float u_size;
uniform float u_choppiness;

out vec4 spectrum;

vec2 multiplyComplex(vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

void main(void) {
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    float h0 = texelFetch(u_initialSpectrum, ind, 0).r;
    float phase = texelFetch(u_phases, ind, 0).r;
    vec2 waveVector = texelFetch(u_wave, ind, 0).xy / u_size;

    float ht = 2.0 * h0 * cos(phase) / u_size;
    float k = length(waveVector);
    vec2 choppiness = (k > 0.0) ? u_choppiness * (waveVector / k) : vec2(0.0);
    spectrum = vec4(0.0, (1.0 - choppiness.x) * ht, 0.0, -choppiness.y * ht);
}
