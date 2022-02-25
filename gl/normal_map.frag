#version 300 es
precision highp float;

uniform float u_resolution;
uniform float u_size;

uniform sampler2D u_displacementMap;

out vec4 outColor;

void main (void) {
    vec2 coordinates = gl_FragCoord.xy / u_resolution;
    float texel = 1.0 / u_resolution;
    float texelSize = u_size / u_resolution;

    vec3 center = texture(u_displacementMap, coordinates).xyz;
    vec3 right = vec3(texelSize, 0.0, 0.0) + texture(u_displacementMap, coordinates + vec2(texel, 0.0)).xyz - center;
    vec3 left = vec3(-texelSize, 0.0, 0.0) + texture(u_displacementMap, coordinates + vec2(-texel, 0.0)).xyz - center;
    vec3 top = vec3(0.0, 0.0, -texelSize) + texture(u_displacementMap, coordinates + vec2(0.0, -texel)).xyz - center;
    vec3 bottom = vec3(0.0, 0.0, texelSize) + texture(u_displacementMap, coordinates + vec2(0.0, texel)).xyz - center;

    vec3 topRight = cross(right, top);
    vec3 topLeft = cross(top, left);
    vec3 bottomLeft = cross(left, bottom);
    vec3 bottomRight = cross(bottom, right);

    outColor = vec4(normalize(topRight + topLeft + bottomLeft + bottomRight), 1.0);
}
