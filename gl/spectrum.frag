#version 300 es
precision highp float;

const float PI = 3.14159265359;

uniform sampler2D u_initialSpectrum;
uniform sampler2D u_phases;

uniform float u_size;
uniform float u_choppiness;

out vec4 outColor;

vec2 multiplyComplex(vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

vec2 getWaveVector() {
    ivec2 res = textureSize(u_phases, 0);
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    int n = (ind.x < res.x / 2) ? ind.x : ind.x - res.x;
    int m = (ind.y < res.y / 2) ? ind.y : ind.y - res.y;
    return 2.0 * PI * vec2(float(n), float(m)) / u_size;
}

void main(void) {
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    float h0 = texelFetch(u_initialSpectrum, ind, 0).r;
    float phase = texelFetch(u_phases, ind, 0).r;
    float ht = 2.0 * h0 * cos(phase);

    vec2 waveVector = getWaveVector();
    float k = length(waveVector);
    vec2 choppiness = (k > 0.0) ? u_choppiness * (waveVector / k) : vec2(0.0);
    outColor = vec4(0.0, (1.0 - choppiness.x) * ht, 0.0, -choppiness.y * ht);
}
