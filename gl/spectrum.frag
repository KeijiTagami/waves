#version 300 es
precision highp float;

uniform sampler2D u_initialSpectrum;
uniform sampler2D u_phases;
uniform sampler2D u_wave;

uniform float u_size;
uniform float u_choppiness;

layout (location = 0) out vec4 real;
layout (location = 1) out vec4 imag;

void main(void) {
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    vec2 wave = texelFetch(u_wave, ind, 0).xy / u_size;
    float k = length(wave);

    float h0 = texelFetch(u_initialSpectrum, ind, 0).r;
    float phase = texelFetch(u_phases, ind, 0).r;
    vec2 delta = (k > 0.0) ? -u_choppiness * wave / k : vec2(0.0);
    real = h0 * cos(-phase) * vec4(delta, 1.0, 0.0);
    imag = h0 * sin(-phase) * vec4(delta, 1.0, 0.0);
}
