var INITIAL_SIZE = 250,
    INITIAL_WIND = [10.0, 10.0],
    INITIAL_CHOPPINESS = 1.5;

var CLEAR_COLOR = [1.0, 1.0, 1.0, 0.0],
    OCEAN_COLOR = [0.004, 0.016, 0.047],
    SKY_COLOR = [3.2, 9.6, 12.8],
    EXPOSURE = 0.35,
    SUN_DIRECTION = [-1.0, 1.0, 1.0],
    GEOMETRY_SIZE = 2000.0,
    GEOMETRY_ORIGIN = -1000.0,
    GEOMETRY_RESOLUTION = 256,
    RESOLUTION = 512;

var SIZE_OF_FLOAT = 4;

var ATTR_POSITION = 0;
var ATTR_COORDINATES = 0;

var INITIAL_SPECTRUM_UNIT = 0,
    PHASE1_UNIT = 1,
    PHASE2_UNIT = 2,
    SPECTRUM_UNIT = 3,
    DISPLACEMENT_MAP_UNIT = 4,
    NORMAL_MAP_UNIT = 5;

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
    WIND_SCALE = 8.0,
    MIN_WIND_SPEED = 5.0,
    MAX_WIND_SPEED = 25.0;

var HANDLE_COLOR = '#666666',
    SLIDER_LEFT_COLOR = UI_COLOR,
    SLIDER_RIGHT_COLOR = '#999999';

var FOV = (60 / 180) * Math.PI,
    NEAR = 1,
    FAR = 10000,
    MIN_ASPECT = 16 / 9;
    
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
    MIN_SIZE = 100,
    MAX_SIZE = 1000,
    SIZE_SLIDER_BREADTH = 3,
    SIZE_HANDLE_SIZE = 24;

var CHOPPINESS_SLIDER_X = -1420,
    CHOPPINESS_SLIDER_Z = 75,
    CHOPPINESS_SLIDER_LENGTH = 300,
    MIN_CHOPPINESS = 0,
    MAX_CHOPPINESS = 2.5,
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

var CAMERA_DISTANCE = 1500,
    ORBIT_POINT = [-200.0, 0.0, 600.0],
    INITIAL_AZIMUTH = 0.4,
    INITIAL_ELEVATION = 0.5,
    MIN_AZIMUTH = -1.0,
    MAX_AZIMUTH = 2.0,
    MIN_ELEVATION = 0.2,
    MAX_ELEVATION = 1.0;

function fullscreenData() {
    return new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]);
}

function phaseArray() {
    const a = new Float32Array(RESOLUTION * RESOLUTION * 4);
    for (let i = 0; i < RESOLUTION; i += 1) {
        for (let j = 0; j < RESOLUTION; j += 1) {
            a[i * RESOLUTION * 4 + j * 4] = Math.random() * 2.0 * Math.PI;
            a[i * RESOLUTION * 4 + j * 4 + 1] = 0;
            a[i * RESOLUTION * 4 + j * 4 + 2] = 0;
            a[i * RESOLUTION * 4 + j * 4 + 3] = 0;
        }
    }
    return a
}

function oceanData() {
    const a = [];
    for (let zi = 0; zi < GEOMETRY_RESOLUTION; zi += 1) {
        let z = (zi + 0.5) / GEOMETRY_RESOLUTION;
        for (let xi = 0; xi < GEOMETRY_RESOLUTION; xi += 1) {
            let x = (xi + 0.5) / GEOMETRY_RESOLUTION;
            a.push(x);
            a.push(z);
        }
    }
    return new Float32Array(a);
}

function oceanIndices() {
    const a = []
    for (let z = 0; z < GEOMETRY_RESOLUTION - 1; z += 1) {
        for (let x = 0; x < GEOMETRY_RESOLUTION - 1; x += 1) {
            let topLeft = z * GEOMETRY_RESOLUTION + x;
            let topRight = topLeft + 1;
            let bottomLeft = topLeft + GEOMETRY_RESOLUTION;
            let bottomRight = bottomLeft + 1;
            a.push(topLeft);
            a.push(bottomLeft);
            a.push(bottomRight);
            a.push(bottomRight);
            a.push(topRight);
            a.push(topLeft);
        }
    }
    return new Uint16Array(a);
}
