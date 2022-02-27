var GEOMETRY_SIZE = 2000.0,
    RESOLUTION = 256;

var INITIAL_SIZE = 250,
    MIN_SIZE = 100,
    MAX_SIZE = 1000,
    INITIAL_WIND_SPEED = 10.0,
    MIN_WIND_SPEED = 5.0,
    MAX_WIND_SPEED = 25.0,
    INITIAL_CHOPPINESS = 1.5,
    MIN_CHOPPINESS = 0,
    MAX_CHOPPINESS = 2.5;

var FOV = (60 / 180) * Math.PI,
    NEAR = 1,
    FAR = 10000,
    MIN_ASPECT = 16 / 9;

var CAMERA_POSITION = [100.0, 100.0, 2000.0],
    INITIAL_AZIMUTH = 0.0,
    MIN_AZIMUTH = -Math.PI,
    MAX_AZIMUTH = Math.PI,
    INITIAL_ELEVATION = 0.5,
    MIN_ELEVATION = 0.0,
    MAX_ELEVATION = 0.5 * Math.PI;

var CLEAR_COLOR = [1.0, 1.0, 1.0, 0.0],
    OCEAN_COLOR = [0.004, 0.016, 0.047],
    SKY_COLOR = [3.2, 9.6, 12.8],
    SUN_DIRECTION = [-1.0, 1.0, 1.0],
    EXPOSURE = 0.35;

var SENSITIVITY = 1.0;

var ATTR_POSITION = 0;
var ATTR_COORDINATES = 0;


function fullscreenData() {
    return new Float32Array([
        -1.0, -1.0,
        -1.0, 1.0,
        1.0, -1.0,
        1.0, 1.0,
    ]);
}

function phaseArray() {
    const a = [];
    for (let i = 0; i < RESOLUTION; i += 1) {
        for (let j = 0; j < RESOLUTION; j += 1) {
            a.push(Math.random() * 2.0 * Math.PI);
        }
    }
    return new Float32Array(a);
}

function waveArray() {
    const a = []
    for (let z = 0; z < RESOLUTION; z += 1) {
        for (let x = 0; x < RESOLUTION; x += 1) {
            a.push(2.0 * Math.PI * ((x < RESOLUTION / 2) ? x : x - RESOLUTION));
            a.push(2.0 * Math.PI * ((z < RESOLUTION / 2) ? z : z - RESOLUTION));
        }
    }
    return new Float32Array(a);
}

function oceanData() {
    const a = [];
    for (let z = 0; z < RESOLUTION; z += 1) {
        for (let x = 0; x < RESOLUTION; x += 1) {
            a.push(x);
            a.push(z);
        }
    }
    return new Int16Array(a);
}

function oceanIndices() {
    const a = []
    for (let z = 0; z < RESOLUTION - 1; z += 1) {
        const zi = (z + 0) * RESOLUTION;
        const zj = (z + 1) * RESOLUTION;
        for (let x = 0; x < RESOLUTION - 1; x += 1) {
        const xi = (x + 0);
        const xj = (x + 1);
            a.push(zi + xi);
            a.push(zj + xi);
            a.push(zj + xj);

            a.push(zj + xj);
            a.push(zi + xj);
            a.push(zi + xi);
        }
    }
    return new Uint16Array(a);
}
