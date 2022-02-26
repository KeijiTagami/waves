#version 300 es
precision highp float;

layout (location = 0) in vec2 a_coordinates;
uniform float u_size;
uniform sampler2D u_displacementMap;

uniform float u_geometrySize;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

out vec2 v_coordinates;
out vec3 v_position;

void main (void) {
    vec3 coord = u_size * vec3(a_coordinates - 0.5, 0.0);
    vec3 modify = texture(u_displacementMap, a_coordinates).xzy;
    vec3 position = (u_geometrySize / u_size) * (coord + modify).xzy;
    v_coordinates = a_coordinates;
    v_position = position;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
}
