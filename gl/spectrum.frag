precision highp float;

const float PI = 3.14159265359;

varying vec2 v_coordinates;

uniform float u_size;
uniform float u_resolution;

uniform sampler2D u_initialSpectrum;
uniform sampler2D u_phases;

uniform float u_choppiness;

vec2 getWaveVector() {
    vec2 coordinates = gl_FragCoord.xy - 0.5;
    float n = (coordinates.x < u_resolution * 0.5) ? coordinates.x : coordinates.x - u_resolution;
    float m = (coordinates.y < u_resolution * 0.5) ? coordinates.y : coordinates.y - u_resolution;
    return (2.0 * PI * vec2(n, m)) / u_size;
}

vec2 multiplyComplex(vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

vec2 conj(vec2 z) {
    return vec2(z[0], -z[1]);
}

void main(void) {
    vec2 waveVector = getWaveVector();
    float k = length(waveVector);
    vec2 choppiness = vec2(0.0);
    if (k > 0.0) {
        choppiness = u_choppiness * (waveVector / k);
    }

    vec2 z_coordinates = vec2(1.0 - v_coordinates + 1.0 / u_resolution);
    vec2 h0 = texture2D(u_initialSpectrum, v_coordinates).rg;
    vec2 h1 = texture2D(u_initialSpectrum, z_coordinates).rg;
    float phase = texture2D(u_phases, v_coordinates).r;
    vec2 phaseVector = vec2(sin(phase), -cos(phase));
    vec2 h = multiplyComplex(h0, phaseVector) + conj(multiplyComplex(h1, phaseVector));
    gl_FragColor = vec4((1.0 - choppiness[0]) * h, -choppiness[1] * h);
}
