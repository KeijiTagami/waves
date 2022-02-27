var projectVector4 = function (out, v) {
    var reciprocalW = 1 / v[3];
    out[0] = v[0] * reciprocalW;
    out[1] = v[1] * reciprocalW;
    out[2] = v[2] * reciprocalW;
    return out;
};

var clamp = function (x, min, max) {
    return Math.min(Math.max(x, min), max);
};

var epsilon = function (x) {
    return Math.abs(x) < 0.000001 ? 0 : x;
};

var toCSSMatrix = function (m) { //flip y to make css and webgl coordinates consistent
    return 'matrix3d(' +
        epsilon(m[0]) + ',' +
        -epsilon(m[1]) + ',' +
        epsilon(m[2]) + ',' +
        epsilon(m[3]) + ',' +
        epsilon(m[4]) + ',' +
        -epsilon(m[5]) + ',' +
        epsilon(m[6]) + ',' +
        epsilon(m[7]) + ',' +
        epsilon(m[8]) + ',' +
        -epsilon(m[9]) + ',' +
        epsilon(m[10]) + ',' +
        epsilon(m[11]) + ',' +
        epsilon(m[12]) + ',' +
        -epsilon(m[13]) + ',' +
        epsilon(m[14]) + ',' +
        epsilon(m[15]) +
    ')';
};

var setPerspective = function (element, value) {
    element.style.WebkitPerspective = value;
    element.style.perspective = value;
};

var setTransformOrigin = function (element, value) {
    element.style.WebkitTransformOrigin = value;
    element.style.transformOrigin = value;
};

var setTransform = function (element, value) {
    element.style.WebkitTransform = value;
    element.style.transform = value;
};

var setText = function (element, value, decimalPlaces) {
    element.textContent = value.toFixed(decimalPlaces);
};

var getMousePosition = function (event, element) {
    var boundingRect = element.getBoundingClientRect();
    return {
        x: event.clientX - boundingRect.left,
        y: event.clientY - boundingRect.top
    };
};

var requestAnimationFrame = window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
