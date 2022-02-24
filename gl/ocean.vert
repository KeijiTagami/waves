precision highp float;

uniform float u_size;
uniform float u_geometrySize;
uniform float u_geometryOrigin;

uniform sampler2D u_displacementMap;
attribute vec2 a_coordinates;

varying vec2 v_coordinates;
varying vec3 v_position;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

void main (void) {
    vec3 a_position = vec3(a_coordinates * u_geometrySize + u_geometryOrigin, 0.0).xzy;
    vec3 z = texture2D(u_displacementMap, a_coordinates).xyz;
    vec3 position = a_position + (u_geometrySize / u_size) * z;
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(position, 1.0);
    v_coordinates = a_coordinates;
    v_position = position;
}
