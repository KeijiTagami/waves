#version 300 es
precision highp float;

in vec2 v_coordinates;
in vec3 v_position;

uniform sampler2D u_displacementMap;

uniform vec3 u_cameraPosition;
uniform vec3 u_sunDirection;

uniform vec3 u_oceanColor;
uniform vec3 u_skyColor;
uniform float u_exposure;

out vec4 outColor;

vec3 getNormal(void) {
    ivec2 res = textureSize(u_displacementMap, 0);
    vec2 z = vec2(1.0, 0.0) / vec2(res);

    vec3 center = texture(u_displacementMap, v_coordinates).xyz;
    vec3 right = texture(u_displacementMap, v_coordinates + z.xy).xyz - center + z.xyy;
    vec3 left = texture(u_displacementMap, v_coordinates - z.xy).xyz - center - z.xyy;
    vec3 top = texture(u_displacementMap, v_coordinates - z.yx).xyz - center - z.yyx;
    vec3 bottom = texture(u_displacementMap, v_coordinates + z.yx).xyz - center + z.yyx;

    vec3 topRight = cross(right, top);
    vec3 topLeft = cross(top, left);
    vec3 bottomLeft = cross(left, bottom);
    vec3 bottomRight = cross(bottom, right);
    return normalize(topRight + topLeft + bottomLeft + bottomRight);
}

vec3 hdr(vec3 color) {
    return 1.0 - exp(-color * u_exposure);
}

void main(void) {
    vec3 normal = getNormal();
    vec3 view = normalize(u_cameraPosition - v_position);
    vec3 sun = normalize(u_sunDirection);

    float fresnel = 0.02 + 0.98 * pow(1.0 - dot(normal, view), 5.0);
    float diffuse = clamp(dot(normal, sun), 0.0, 1.0);

    vec3 color = fresnel * u_skyColor + (1.0 - fresnel) * diffuse * u_oceanColor;
    outColor = vec4(hdr(color), 1.0);
}
