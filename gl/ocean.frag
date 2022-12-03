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
float calcSpline3(const in float x,const in float a,const in float b,const in float c,const in float d,const in float cp){
    return a+b*(x-cp)+c*pow(x-cp,2.0)+d*pow(x-cp,3.0);
}
float calcSpline3_4p(const in float x,const in vec4 a,const in vec4 b,const in vec4 c,const in vec4 d,const in vec4 cp){   
    if (cp[0] <=x && x<cp[1]){
        return calcSpline3(x,a[0],b[0],c[0],d[0],cp[0]);
    }else if (x<cp[2]){
        return calcSpline3(x,a[1],b[1],c[1],d[1],cp[1]);
    }else if (x<cp[3]){
        return calcSpline3(x,a[2],b[2],c[2],d[2],cp[2]);
    }else if(x<=255.0){
        return calcSpline3(x,a[3],b[3],c[3],d[3],cp[3]);
    }
    return x;
}
float calcSpline3_3p(const in float x,const in vec3 a,const in vec3 b,const in vec3 c,const in vec3 d,const in vec3 cp){   
    if (cp[0] <=x && x<cp[1]){
        return calcSpline3(x,a[0],b[0],c[0],d[0],cp[0]);
    }else if (x<cp[2]){
        return calcSpline3(x,a[1],b[1],c[1],d[1],cp[1]);
    }else if (x<255.0){
        return calcSpline3(x,a[2],b[2],c[2],d[2],cp[2]);
    }
    return x;
}


void main(void) {
    vec3 view = normalize(u_cameraPosition - v_position);
    vec3 sun = normalize(u_sunDirection);
    vec3 half_vector = normalize(view + sun);
    
    vec3 color = vec3(0.0, 0.0, 1.0);
    color = dot(v_normal, sun) * u_oceanColor;
    color += pow(dot(v_normal, half_vector), 5.0) * u_skyColor;
    //トーンカーブ
    vec4 a_rgb=vec4(0.0,23.0,120.0,217.0);
    vec4 b_rgb=vec4(0.4441782,0.8366436,1.1245627,1.1792966);
    vec4 c_rgb=vec4(0.0,0.0098116,-0.0062571,0.0067784);
    vec4 d_rgb=vec4(0.0000818,-0.0000661,0.0000414,-0.0000779);
    vec4 cp_rgb=vec4(0.0,40.0,121.0,226.0);
    color[0]=calcSpline3_4p(color[0]*255.0,a_rgb,b_rgb,c_rgb,d_rgb,cp_rgb)/255.0;
    color[1]=calcSpline3_4p(color[1]*255.0,a_rgb,b_rgb,c_rgb,d_rgb,cp_rgb)/255.0;
    color[2]=calcSpline3_4p(color[2]*255.0,a_rgb,b_rgb,c_rgb,d_rgb,cp_rgb)/255.0;
    vec4 a_r=vec4(0.0,58.0,110.0,191.0);
    vec4 b_r=vec4(0.2294622,0.14120434,1.6440034,1.0900238);
    vec4 c_r=vec4(0.0,0.0127159,-0.0054672,-0.0037658);
    vec4 d_r=vec4(0.0000456,-0.0001894,0.0000095,0.0000179);
    vec4 cp_r=vec4(0.0,93.0,125.0,185.0);
    color[0]=calcSpline3_4p(color[0]*255.0,a_r,b_r,c_r,d_r,cp_r)/255.0;
    vec4 a_g=vec4(0.0,  85.0, 145.0, 216.0);
    vec4 b_g=vec4(2.3451981, 1.5291161, 0.7565979, 0.9484865);
    vec4 c_g=vec4(0.0       , -0.0199044,  0.0107078, -0.0078438);
    vec4 d_g=vec4(-0.0001618,  0.0001215, -0.0000923,  0.0000415);
    vec4 cp_g=vec4(0.0,  41.0, 125.0, 192.0);
    color[1]=calcSpline3_4p(color[1]*255.0,a_g,b_g,c_g,d_g,cp_g)/255.0;
    vec3 a_b=vec3(0.0, 113.0, 189.0);
    vec3 b_b=vec3(0.7630131, 0.5795639, 2.223841);
    vec3 c_b=vec3(0.0       , -0.0011394,  0.0249695);
    vec3 d_b=vec3(-0.0000024,  0.0001261, -0.0003329);
    vec3 cp_b=vec3(0.0, 161.0, 230.0);
    color[2]=calcSpline3_3p(color[2]*255.0,a_b,b_b,c_b,d_b,cp_b)/255.0;
    //カラーバランス1
    color[0] = pow(clamp((color[0]-0.3843)/0.6156,0.0,1.0),1.45);//R
    color[1] = pow(clamp(color[1]/0.9764,0.0,1.0),1.21);//G
    color[2] = pow(clamp((color[2]-0.094)/0.7686,0.0,1.0),0.6896);//B
    //カラーバランス1
    color[0] = pow(clamp((color[0]-0.0039)/0.9176,0.0,1.0),1.415);//R
    color[1] = pow(clamp(color[1],0.0,1.0),1.315);//G
    color[2] = pow(clamp((color[2]-0.1803)/0.7098,0.0,1.0),0.7067);//B
    //色相・彩度
    color[0]=color[0]*255.0;
    color[1]=color[1]*255.0;
    color[2]=color[2]*255.0;
    float lmin=min(color[0],min(color[1],color[2]));
    float lmax=max(color[0],max(color[1],color[2]));
    vec3 HSV;
    if (color[0]==lmax){
        HSV[0]=60.0*(color[1]-color[2])/(lmax-lmin);
    }else if (color[1]==lmax){
        HSV[0]=60.0*(color[2]-color[0])/(lmax-lmin)+120.0;
    }else if (color[2]==lmax){
        HSV[0]=60.0*(color[0]-color[1])/(lmax-lmin)+240.0;
    }
    HSV[1]=(lmax-lmin)/lmax;
    HSV[2]=lmax;
    HSV[0]=HSV[0]-15.0;
    HSV[1]=HSV[1]*0.96;
    HSV[2]=HSV[2]*0.98;
    float h= floor(HSV[0]/60.0);
    float P=HSV[2]*(1.0-HSV[1]);
    float Q=HSV[2]*(1.0-HSV[1]*(HSV[0]/60.0-float(h)));
    float T=HSV[2]*(1.0-HSV[1]*(1.0-HSV[0]/60.0+float(h)));
    if(h==0.0){
        color[0]=HSV[2];
        color[1]=T;
        color[2]=P;
    }else if(h==1.0){
        color[0]=Q;
        color[1]=HSV[2];
        color[2]=P;
    }else if(h==2.0){
        color[0]=P;
        color[1]=HSV[2];
        color[2]=T;
    }else if(h==3.0){
        color[0]=P;
        color[1]=Q;
        color[2]=HSV[2];
    }else if(h==4.0){
        color[0]=T;
        color[1]=P;
        color[2]=HSV[2];
    }else if(h==5.0){
        color[0]=HSV[2];
        color[1]=P;
        color[2]=Q;
    }
    color[0]=clamp(color[0]/255.0,0.0,1.0);
    color[1]=clamp(color[1]/255.0,0.0,1.0);
    color[2]=clamp(color[2]/255.0,0.0,1.0);
    //レベル補正
    color[0] = pow(clamp((color[0]-0.051)/0.949,0.0,1.0),1.492);//R
    color[1] = pow(clamp((color[1]-0.051)/0.949,0.0,1.0),1.492);//G
    color[2] = pow(clamp((color[2]-0.051)/0.949,0.0,1.0),1.492);//B
    outColor = vec4(color, 1.0);
}
