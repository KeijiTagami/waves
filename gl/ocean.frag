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
    vec3 half_vector = normalize(view + sun);
    
    //以下2行を有効にすると高さ情報のみ描画
    //vec3 color = vec3(1.0,1.0,1.0);
    //color*=v_position[2];
    
    //以下3行を有効にすると光と色付きの描画
    vec3 color = vec3(0.0, 0.0, 1.0);
    color = dot(v_normal, sun) * u_oceanColor;
    color += pow(dot(v_normal, half_vector), 5.0) * u_skyColor;
    
    outColor = vec4(color, 1.0);
}
