"use strict";

class Main {

    constructor() {
        const wave_offsetx=(1920-WAVE_WIDTH)/2;//波を1920*1080スクリーンの中心に配置
        const wave_offsety=(1080-WAVE_HEIGHT)/2;
        const canvas_blue = document.getElementById('blue_wave');
        canvas_blue.width = OUTPUT_WIDTH
        canvas_blue.height = OUTPUT_HEIGHT
        canvas_blue.style.top = wave_offsety + "px"
        canvas_blue.style.left = wave_offsetx + "px"
        canvas_blue.style.width = WAVE_WIDTH + "px"
        canvas_blue.style.height = WAVE_HEIGHT + "px"
        this.canvas_blue_ctx = canvas_blue.getContext('2d');

        const canvas_white = document.getElementById('white_wave');
        canvas_white.width = OUTPUT_WIDTH
        canvas_white.height = OUTPUT_HEIGHT
        canvas_white.style.top = wave_offsety + "px"
        canvas_white.style.left = wave_offsetx + "px"
        canvas_white.style.width = WAVE_WIDTH + "px"
        canvas_white.style.height = WAVE_HEIGHT + "px"
        this.canvas_white_ctx = canvas_white.getContext('2d');

        
        const canvas_wallheight = document.getElementById('wall_height');
        canvas_wallheight.width = OUTPUT_WIDTH
        canvas_wallheight.height = OUTPUT_HEIGHT
        const whs_width=parseInt(WALLHEIGHT_WIDTH*SCALE_WALLHEIGHT);//スケーリングした高さ画像の幅
        canvas_wallheight.style.width = whs_width + "px"
        canvas_wallheight.style.height = parseInt(WALLHEIGHT_HEIGHT*SCALE_WALLHEIGHT) + "px"
        const wallheight_offsetx=(WF_WIDTH_3-whs_width)/2//高さの位置調整(幅は半々, 縦は上部が5, 下部が1の比)
        const wallheight_offsety=-150
        canvas_wallheight.style.top = 1080+wallheight_offsety + "px"//!後で位置を計算
        canvas_wallheight.style.left = (WF_WIDTH_3+wallheight_offsetx) + "px"
        this.canvas_wallheight_ctx = canvas_wallheight.getContext('2d');

        const canvas_wallformat = document.getElementById('wallformat');
        canvas_wallformat.width = WF_WIDTH;
        canvas_wallformat.height = WF_HEIGHT;
        canvas_wallformat.style.top = 1080 + "px"
        canvas_wallformat.style.left = 0 + "px"
        canvas_wallformat.style.width = WF_WIDTH + "px"
        canvas_wallformat.style.height = WF_HEIGHT + "px"
        this.canvas_wallformat_ctx = canvas_wallformat.getContext('2d');


        this.running = false
        this.images = []

        this.worker = new Worker("worker.js")
        this.worker.addEventListener("message", m => {
            if (m.data.type == "ready") {
                this.setup()
            } else if (m.data.type == "output") {
                this.getSimulation(m.data.value)
            }
        })
        this.worker.postMessage({type: "canvas"})
    }

    setup() {
        navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
            const audio = new AudioContext()
            this.audio_analyzer = audio.createAnalyser()
            const audio_source = audio.createMediaStreamSource(stream)
            audio_source.connect(this.audio_analyzer)
            this.freqData = new Float32Array(this.audio_analyzer.frequencyBinCount)

            this.button = document.getElementById('run')
            this.button.addEventListener("click", (e) => {
                if (this.running) {
                    this.stop()
                } else {
                    this.run()
                }
            })
            this.run()
        })
        this.setWallInit();
    }

    run() {
        this.running = true
        this.render_interval = null
        this.requestSimulation()
        this.audio_timer = setInterval(() => this.changeParameter(), 5000)
        this.button.innerText = "stop"
    }

    stop() {
        this.running = false
        clearInterval(this.render_interval)
        this.render_interval = null
        clearInterval(this.audio_interval)
        this.audio_timer = null
        this.button.innerText = "start"
    }

    changeParameter() {
        this.audio_analyzer.getFloatFrequencyData(this.freqData)
        const min_val = -70
        const max_val = -20
        var val = this.freqData[100]
        val = (val - min_val) / (max_val - min_val)
        if (val < 0) { val = 0 }
        if (val > 1) { val = 1 }
        val = MIN_WIND_SPEED + val * (MAX_WIND_SPEED - MIN_WIND_SPEED)
        console.log("windSpeed", val)
        this.worker.postMessage({type: "setWindSpeed", value: val})
    }

    requestSimulation() {
        if (this.running) {
            if (this.images.length < MAX_STOCK) { 
                console.log("request")
                this.worker.postMessage({type: "create", value: BATCH})
            } else {
                setTimeout(this.requestSimulation.bind(this), 10)
            }
        }
    }

    getSimulation(data) {
        console.log("get")
        this.images = this.images.concat(data)
        console.log(this.images.length)
        setTimeout(this.requestSimulation.bind(this), 10)
        if (this.render_interval == null) {
            if (this.images.length >= MIN_STOCK) {
                this.render_interval = setInterval(this.render.bind(this), 1000 * SLOW * DELTA_TIME)
            }
        }
    }

    render() {
        if (this.running) {
            if (this.images.length == 0) {
                clearInterval(this.render_interval)
                this.render_interval = null
            } else {
                const now = Date.now()
                console.log("render", this.images.length, now - this.timer, "sec")
                this.timer = now
                const [blue, white, wall] = this.images.shift()
                this.canvas_blue_ctx.putImageData(blue, 0, 0)
                this.canvas_white_ctx.putImageData(white, 0, 0);
                this.canvas_wallheight_ctx.putImageData(wall, 0, 0);
            }
        }
    }
    setWallInit(){
        this.canvas_wallformat_ctx.fillStyle='rgb(0,0,0)'//黒：LEDを使わない
        this.canvas_wallformat_ctx.fillRect(0,0,WF_WIDTH_3,WF_HEIGHT)//LED
        //位置(高さ)の部分には何もしない
        // this.canvas_wallformat_ctx.fillStyle='rgb(127,127,127)'//(グレー:中間位置)
        // this.canvas_wallformat_ctx.fillRect(WF_WIDTH_3,0,WF_WIDTH_3*2,WF_HEIGHT)//キネ位置
        this.canvas_wallformat_ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas_wallformat_ctx.fillRect(WF_WIDTH_3*2,0,WF_WIDTH_3*3,WF_HEIGHT)//キネ速度
    }
}

window.onload = () => {
    new Main()
}
