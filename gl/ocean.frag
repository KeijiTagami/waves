#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;

uniform vec3 u_cameraPosition;
uniform vec3 u_sunDirection;

uniform vec3 u_oceanColor;
uniform vec3 u_skyColor;
uniform float u_exposure;

out vec4 outColor;

vec3 hdr(vec3 color) {
    return 1.0 - exp(-color * u_exposure);
}

void main(void) {
    vec3 view = normalize(u_cameraPosition - v_position);
    vec3 sun = normalize(u_sunDirection);

    float fresnel = 0.02 + 0.98 * pow(1.0 - dot(v_normal, view), 5.0);
    float diffuse = clamp(dot(v_normal, sun), 0.0, 1.0);

    vec3 color = fresnel * u_skyColor + (1.0 - fresnel) * diffuse * u_oceanColor;
    outColor = vec4(hdr(color), 1.0);
}
