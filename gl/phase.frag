#version 300 es
precision highp float;

const float PI = 3.14159265359;
const float G = 9.81;
const float KM = 370.0;

uniform sampler2D u_phases;

uniform float u_size;
uniform float u_deltaTime;

out vec4 outColor;

vec2 getWaveVector() {
    ivec2 res = textureSize(u_phases, 0);
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    int n = (ind.x < res.x / 2) ? ind.x : ind.x - res.x;
    int m = (ind.y < res.y / 2) ? ind.y : ind.y - res.y;
    return 2.0 * PI * vec2(float(n), float(m)) / u_size;
}

float omega(float k) {
    return sqrt(G * k * (1.0 + k * k / KM * KM));
}

void main (void) {
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    float inPhase = texelFetch(u_phases, ind, 0).r;

    vec2 waveVector = getWaveVector();
    float k = length(waveVector);

    float outPhase = mod(inPhase + omega(k) * u_deltaTime, 2.0 * PI);
    outColor = vec4(outPhase, 0.0, 0.0, 0.0);
}
