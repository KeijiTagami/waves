precision highp float;

const float PI = 3.14159265359;

uniform float u_resolution;

uniform sampler2D u_input;
uniform float u_subtransformSize;

vec2 multiplyComplex (vec2 a, vec2 b) {
    return vec2(a[0] * b[0] - a[1] * b[1], a[1] * b[0] + a[0] * b[1]);
}

float toIndex(float x) {
    return u_resolution * x - 0.5;
}

float toCoord(float idx) {
    return (idx + 0.5) / u_resolution;
}

float modifyIndex(float x) {
    float hsize = 0.5 * u_subtransformSize;
    return hsize * floor(x / u_subtransformSize) + mod(x, hsize);
}

void main (void) {
    vec2 coord = gl_FragCoord.xy / u_resolution;

    //transform two complex sequences simultaneously
    #ifdef HORIZONTAL
    float idx = toIndex(coord.x);
    float xcoord = toCoord(modifyIndex(idx));
    vec4 even = texture2D(u_input, vec2(xcoord, coord.y));
    vec4 odd = texture2D(u_input, vec2(xcoord + 0.5, coord.y));
    #else
    float idx = toIndex(coord.y);
    float ycoord = toCoord(modifyIndex(idx));
    vec4 even = texture2D(u_input, vec2(coord.x, ycoord));
    vec4 odd = texture2D(u_input, vec2(coord.x, ycoord + 0.5));
    #endif

    float twiddleArgument = -2.0 * PI * idx / u_subtransformSize;
    vec2 twiddle = vec2(cos(twiddleArgument), sin(twiddleArgument));
    vec2 out1 = even.xy + multiplyComplex(twiddle, odd.xy);
    vec2 out2 = even.zw + multiplyComplex(twiddle, odd.zw);
    gl_FragColor = vec4(out1, out2);
}
