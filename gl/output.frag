#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;

out vec4 outColor;

void main(void) {
    outColor = vec4(v_position[2], v_normal);
}
