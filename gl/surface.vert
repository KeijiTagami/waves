#version 300 es
precision highp float;

layout (location = 0) in ivec2 a_index;
uniform sampler2D u_displacementMap;

uniform float u_geometrySize;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

out vec2 v_coordinates;
out vec3 v_position;

void main (void) {
    ivec2 res = textureSize(u_displacementMap, 0);
    v_coordinates = (vec2(a_index) + 0.5) / vec2(res);
    vec3 coord = vec3(v_coordinates - 0.5, 0.0);
    vec3 modify = texture(u_displacementMap, v_coordinates).xzy;
    v_position = u_geometrySize * (coord + modify).xzy;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(v_position, 1.0);
}
