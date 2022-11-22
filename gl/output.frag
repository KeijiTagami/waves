#version 300 es
precision highp float;

in vec3 v_position;
//in vec3 v_normal;

out float outColor;

void main(void) {
    outColor = v_position[2];
}
