precision highp float;

uniform float u_size;
uniform float u_geometrySize;

uniform sampler2D u_displacementMap;
attribute vec2 a_coordinates;

varying vec2 v_coordinates;
varying vec3 v_position;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

void main (void) {
    vec3 coord = vec3(a_coordinates - 0.5, 0.0).xzy;
    vec3 modify = texture2D(u_displacementMap, a_coordinates).xyz;
    vec3 position = u_geometrySize * (coord + modify / u_size);
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
    v_coordinates = a_coordinates;
    v_position = position;
}
