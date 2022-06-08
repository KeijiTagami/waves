var RESOLUTION = 256;

var INITIAL_SIZE = 250,
    MIN_SIZE = 100,
    MAX_SIZE = 1000,
    INITIAL_WIND_SPEED = 10.0,
    INITIAL_WIND_DIRECTION = 0.0,
    MIN_WIND_SPEED = 5.0,
    MAX_WIND_SPEED = 25.0,
    INITIAL_CHOPPINESS = 1.5,
    MIN_CHOPPINESS = 0,
    MAX_CHOPPINESS = 5.0;

var FOV = (50 / 180) * Math.PI,
    NEAR = 10,
    FAR = 1000,
    MIN_ASPECT = 16 / 9;

var CAMERA_POSITION = [0.0, 0.0, 1.2],
    INITIAL_AZIMUTH = 0.0,
    MIN_AZIMUTH = -Math.PI,
    MAX_AZIMUTH = Math.PI,
    INITIAL_ELEVATION = Math.PI / 2,
    MIN_ELEVATION = 0.0,
    MAX_ELEVATION = 0.5 * Math.PI;

var CLEAR_COLOR = [1.0, 1.0, 1.0, 1.0],
    OCEAN_COLOR = [0.0, 0.0, 1.0],
    SKY_COLOR = [1.0, 1.0, 1.0],
    SUN_DIRECTION = [1.0, 1.0, 1.0];

var OUTPUT_SIZE = 1024,
    OUTPUT_POS = -260,
    GRAYSCALE_CLEAR_COLOR = [0., 0., 0., 1.0];
    OUTPUT_CLEAR_COLOR = [0.0, 0.0, 0.0, 0.0];

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
            a.push((x + 0.5) / RESOLUTION);
            a.push((z + 0.5) / RESOLUTION);
        }
    }
    return new Float32Array(a);
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
