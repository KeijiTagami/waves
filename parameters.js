var GEOMETRY_SIZE = 2000.0,
    RESOLUTION = 256;

var INITIAL_SIZE = 250,
    MIN_SIZE = 100,
    MAX_SIZE = 1000,
    INITIAL_WIND = [10.0, 10.0],
    MIN_WIND_SPEED = 5.0,
    MAX_WIND_SPEED = 25.0,
    INITIAL_CHOPPINESS = 1.5,
    MIN_CHOPPINESS = 0,
    MAX_CHOPPINESS = 2.5;

var FOV = (60 / 180) * Math.PI,
    NEAR = 1,
    FAR = 10000,
    MIN_ASPECT = 16 / 9;

var CAMERA_DISTANCE = 1500,
    ORBIT_POINT = [-100.0, 200.0, 600.0],
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


var SIZE_OF_FLOAT = 4;

var ATTR_POSITION = 0;
var ATTR_COORDINATES = 0;

var UI_COLOR = 'rgb(52, 137, 189)';

var PROFILE_AMPLITUDE = 50,
    PROFILE_OMEGA = 0.05,
    PROFILE_PHI = -2.5,
    PROFILE_STEP = 5,
    PROFILE_OFFSET = 52,
    PROFILE_COLOR = 'rgb(52, 137, 189)',
    PROFILE_LINE_WIDTH = 3,
    CHOPPINESS_SCALE = 0.15;

var ARROW_ORIGIN = [-1250, 0, 500],
    ARROW_SHAFT_WIDTH = 80,
    ARROW_HEAD_WIDTH = 160,
    ARROW_HEAD_HEIGHT = 60,
    ARROW_OFFSET = 40,
    WIND_SCALE = 8.0;

var HANDLE_COLOR = '#666666',
    SLIDER_LEFT_COLOR = UI_COLOR,
    SLIDER_RIGHT_COLOR = '#999999';
    
var WIND_SPEED_DECIMAL_PLACES = 1,
    SIZE_DECIMAL_PLACES = 0,
    CHOPPINESS_DECIMAL_PLACES = 1;

var SENSITIVITY = 1.0;

var WIND_SPEED_X = -1350;
var MIN_WIND_SPEED_Z = 600,
    WIND_SPEED_OFFSET = 30;

var OVERLAY_DIV_ID = 'overlay',
    PROFILE_CANVAS_ID = 'profile',
    SIMULATOR_CANVAS_ID = 'simulator',
    UI_DIV_ID = 'ui',
    CAMERA_DIV_ID = 'camera',
    WIND_SPEED_DIV_ID = 'wind',
    WIND_SPEED_SPAN_ID = 'wind-speed',
    CHOPPINESS_DIV_ID = 'choppiness';

var SIZE_SLIDER_X = -200,
    SIZE_SLIDER_Z = 1100,
    SIZE_SLIDER_LENGTH = 400,
    SIZE_SLIDER_BREADTH = 3,
    SIZE_HANDLE_SIZE = 24;

var CHOPPINESS_SLIDER_X = -1420,
    CHOPPINESS_SLIDER_Z = 75,
    CHOPPINESS_SLIDER_LENGTH = 300,
    CHOPPINESS_SLIDER_BREADTH = 6,
    CHOPPINESS_HANDLE_SIZE = 30;

var ARROW_TIP_RADIUS = 100,
    SIZE_HANDLE_RADIUS = 30,
    CHOPPINESS_HANDLE_RADIUS = 100;

var NONE = 0,
    ORBITING = 1,
    ROTATING = 2,
    SLIDING_SIZE = 3,
    SLIDING_CHOPPINESS = 4;

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
    for (let zi = 0; zi < RESOLUTION; zi += 1) {
        let z = (zi + 0.5) / RESOLUTION;
        for (let xi = 0; xi < RESOLUTION; xi += 1) {
            let x = (xi + 0.5) / RESOLUTION;
            a.push(x);
            a.push(z);
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
            a.push(zi + x);
            a.push(zj + x);
        }
    }
    return new Uint16Array(a);
}
