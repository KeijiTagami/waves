#version 300 es
precision highp float;

in vec3 v_position;

out vec4 outColor;

void main(void) {
    vec3 color = vec3(1.0,1.0,1.0);
    color*=(v_position[2])*0.15+0.7;
    outColor = vec4(color, 1.0);
}
