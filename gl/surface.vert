#version 300 es
precision highp float;

layout (location = 0) in vec2 a_coordinates;
uniform sampler2D u_elevation;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;

out vec3 v_position;
out vec3 v_normal;

void main(void) {
    vec2 res = vec2(textureSize(u_elevation, 0));
    vec2 z = vec2(1.0, 0.0) / res;

    vec3 center = texture(u_elevation, a_coordinates).xyz;
    vec3 right  = texture(u_elevation, a_coordinates + z.xy).xyz - center;
    vec3 left   = texture(u_elevation, a_coordinates - z.xy).xyz - center;
    vec3 top    = texture(u_elevation, a_coordinates - z.yx).xyz - center;
    vec3 bottom = texture(u_elevation, a_coordinates + z.yx).xyz - center;

    vec3 topRight    = cross(top, right);
    vec3 topLeft     = cross(left, top);
    vec3 bottomLeft  = cross(bottom, left);
    vec3 bottomRight = cross(right, bottom);

    v_position = center;
    v_normal = normalize(topRight + topLeft + bottomLeft + bottomRight);
    gl_Position = u_projectionMatrix * u_viewMatrix * vec4(v_position, 1.0);
}
