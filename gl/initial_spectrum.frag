#version 300 es
precision highp float;

const float PI = 3.14159265359;
const float G = 9.81;
const float KM = 370.0;
const float CM = 0.23;
const float OMEGA = 0.84;
const float GAMMA = 1.7;

uniform int u_resolution;

uniform vec2 u_wind;
uniform float u_size;

out vec4 phase;

float square(float x) {
    return x * x;
}

float omegax(float k) {
    return sqrt(G * (1.0 + square(k / KM)) / k);
}

vec2 getWaveVector() {
    ivec2 res = ivec2(u_resolution, u_resolution);
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    int n = (ind.x < res.x / 2) ? ind.x : ind.x - res.x;
    int m = (ind.y < res.y / 2) ? ind.y : ind.y - res.y;
    return 2.0 * PI * vec2(float(n), float(m)) / u_size;
}

void main(void) {
    float ALPHA = pow(OMEGA, -2.9) * pow(G, -0.45) / 0.0000037;
    float BETA = CM / (0.41 * OMEGA * sqrt(G));
    float SIGMA1 = OMEGA / sqrt(10.0);
    float SIGMA2 = 0.0016 * square(1.0 + 4.0 * pow(OMEGA, -3.0));
    float SIGMA3 = 0.25;
    float FP = 0.006 * sqrt(OMEGA);
    float FM = 0.01;

    vec2 waveVector = getWaveVector();
    float k = length(waveVector);
    float ok = omegax(k);

    float l = square(OMEGA) * G / square(length(u_wind));
    float ol = omegax(l);
    float uStar = BETA * sqrt(l) * log(ALPHA * pow(l, 1.45) * pow(ol, 0.9));

    float alphap = pow(GAMMA, exp(-SIGMA2 * square(sqrt(k / l) - 1.0)));
    float fp = FP * exp(-SIGMA1 * (sqrt(k / l) - 1.0));
    float bl = alphap * fp * ol / ok;

    float alpham = (uStar < 1.0) ? 1.0 - log(uStar) : 1.0 - 3.0 * log(uStar);
    float fm = FM * exp(-SIGMA3 * square(k / KM - 1.0));
    float bh = alpham * fm * CM / ok;

    float b = (bl + bh) / 2.0;

    float a0 = log(2.0) / 4.0;
    float am = 0.13 / uStar;
    float delta = tanh(a0 + 4.0 * pow(ok / ol, 2.5) + am * pow(CM / ok, 2.5));
    float cosPhi = dot(normalize(u_wind), normalize(waveVector));
    float s = 1.0 + delta * (2.0 * cosPhi * cosPhi - 1.0);

    float lpm = exp(-1.25 / square(k / l));
    float h = (k > 0.0) ? sqrt(PI * b * s * lpm) / square(k) : 0.0;
    phase = vec4(h / u_size, 0.0, 0.0, 0.0);
}
