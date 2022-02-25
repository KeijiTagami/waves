#version 300 es
precision highp float;

const float PI = 3.14159265359;
const float G = 9.81;
const float KM = 370.0;

uniform float u_resolution;
uniform float u_size;

uniform sampler2D u_phases;
uniform float u_deltaTime;

out vec4 outColor;

vec2 getWaveVector() {
    vec2 ind = gl_FragCoord.xy - 0.5;
    float n = (ind.x < u_resolution * 0.5) ? ind.x : ind.x - u_resolution;
    float m = (ind.y < u_resolution * 0.5) ? ind.y : ind.y - u_resolution;
    return 2.0 * PI * vec2(n, m) / u_size;
}

float omega(float k) {
    return sqrt(G * k * (1.0 + k * k / KM * KM));
}

void main (void) {
    vec2 coordinates = gl_FragCoord.xy / u_resolution;
    float inPhase = texture(u_phases, coordinates).r;

    vec2 waveVector = getWaveVector();
    float k = length(waveVector);

    float outPhase = mod(inPhase + omega(k) * u_deltaTime, 2.0 * PI);
    outColor = vec4(outPhase, 0.0, 0.0, 0.0);
}
