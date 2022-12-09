
//コンテンツの大きさに関する設定
var WAVE_WIDTH = 624,//波のコンテンツの大きさ(px)(壁ぴったりで(624,780))
    WAVE_HEIGHT =780;
var WF_WIDTH=1080,//壁の[LED, 高さ, 速度]の画面
    WF_WIDTH_3=360,//壁のLED,高さ, 速度それぞれの幅
    WF_HEIGHT=450;
var WALLHEIGHT_WIDTH=WAVE_WIDTH,//プロジェクターにおける波の高さの大きさ(px)
    WALLHEIGHT_HEIGHT=WAVE_HEIGHT,
    SCALE_WALLHEIGHT=7/12;//プロジェクターから壁へのスケーリング

//学習済みモデルの名前
MODEL_NAME="n3_l4_s2_lr0.0001_m18_(312_390)"
var OUTPUT_WIDTH = parseInt(MODEL_NAME.match(/\([^_]*/g)[0].replace(/\(/,"")),
    OUTPUT_HEIGHT = parseInt(MODEL_NAME.match(/[^_]*\)/g)[0].replace(/\)/,""))
var WHITE_MARGIN = parseInt(MODEL_NAME.match(/m[^_]*/g)[0].replace(/m/,"")) //モデルによって上下左右クリップされる
var WHITE_ALPHA=0.7;//白波の透明度
//var TF_TYPE = "wasm"
var TF_TYPE = "webgl"
//var TF_TYPE = "custom-webgl"

var DELTA_TIME = 0.06,  // シミュレーション内でのフレーム時間
    SLOW = 1,          // 実時間との比、大きいとゆっくり再生
    DELTA_WHITE = 2,   // 青何枚につき白を表示するか
    MIN_STOCK = 30,   // これだけためてからスタートする
    MAX_STOCK = 80,  // 何枚までためるか
    BATCH = 1          // worker が1回で計算するフレーム数

var DECIBEL_MIN=-150.0,//音の大きさ
    DECIBEL_MAX=-60.0,
    BIN=64,//音のヒストグラム
    HIST_START=0,//インデックスの開始
    HIST_END=500,//インデックスの終了
    HIST_MARGIN=0.8//ヒストグラムの隣接間隔

var AS_HEIGHT=200,
    AS_WIDTH=600;

var RESOLUTION = 256;

var INITIAL_SIZE = 300,
    MIN_SIZE = 100,
    MAX_SIZE = 1000,
    INITIAL_WIND_SPEED = 18.0,//18(12~22)
    INITIAL_WIND_DIRECTION = -117.0,
    MIN_WIND_SPEED = 11.0,
    MAX_WIND_SPEED = 22.0,
    INITIAL_CHOPPINESS = 3.5,//3.5(2.5~4.5)
    MIN_CHOPPINESS = 2.5,
    MAX_CHOPPINESS = 4.5;

var FOV = 30 * (Math.PI / 180),
    NEAR = 100,
    FAR = 2000,
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
    SUN_DIRECTION = [1.0, 1.0, 1.0],
    OUTPUT_CLEAR_COLOR = [0.0, 0.0, 0.0, 1.0];

const M = WHITE_MARGIN
const w = OUTPUT_WIDTH
const h = OUTPUT_HEIGHT
const W = w + 2 * M
const H = h + 2 * M

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
