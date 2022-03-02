#version 300 es
precision highp float;

const float PI = 3.14159265359;
const float G = 9.81;
const float KM = 370.0;

uniform sampler2D u_phases;
uniform sampler2D u_wave;

uniform float u_size;
uniform float u_deltaTime;

layout (location = 0) out vec4 outPhase;

float omega(float k) {
    return sqrt(G * k * (1.0 + k * k / KM * KM));
}

void main (void) {
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    float inPhase = texelFetch(u_phases, ind, 0).r;

    vec2 wave = texelFetch(u_wave, ind, 0).xy / u_size;
    float k = length(wave);

    float phase = mod(inPhase + omega(k) * u_deltaTime, 2.0 * PI);
    outPhase = vec4(phase, 0.0, 0.0, 0.0);
}
