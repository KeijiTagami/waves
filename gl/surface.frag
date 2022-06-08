#version 300 es
precision highp float;

uniform sampler2D u_fluctuation;
uniform float u_size;

layout (location = 0) out vec4 v_position;

void main(void) {
    vec2 res = vec2(textureSize(u_fluctuation, 0));
    vec2 coord = u_size * (gl_FragCoord.xy / res - 0.5);
    ivec2 ind = ivec2(gl_FragCoord.xy - 0.5);
    vec3 fluctuation = texelFetch(u_fluctuation, ind, 0).xyz;
    vec3 surface = vec3(coord, 0.0) + fluctuation;
    v_position = vec4(surface, 0.0);
}
