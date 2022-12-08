"use strict";

class Main {

    constructor() {
        const wave_offsetx=(1920-WAVE_WIDTH)/2+7;//波を1920*1080スクリーンの中心に配置
        const wave_offsety=(1080-WAVE_HEIGHT)/2+52*2;//壁にフィットさせるときは2壁分(52px*2)下にずらす
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
        const whs_height=parseInt(WALLHEIGHT_HEIGHT*SCALE_WALLHEIGHT);//スケーリングした高さ画像の幅
        canvas_wallheight.style.width = whs_width + "px"
        canvas_wallheight.style.height = whs_height + "px"
        const wallheight_offsetx=(WF_WIDTH_3-whs_width)/2//高さの位置調整(幅は半々, 縦は上部が5, 下部が1の比)
        const wallheight_offsety=(WF_HEIGHT-whs_height)/2
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

        const canvas_audio_spec_high = document.getElementById('audio_spec_high');
        canvas_audio_spec_high.width = AS_WIDTH;
        canvas_audio_spec_high.height = AS_HEIGHT;
        canvas_audio_spec_high.style.top = 800 + "px"
        canvas_audio_spec_high.style.left = 0 + "px"
        canvas_audio_spec_high.style.width = AS_WIDTH + "px"
        canvas_audio_spec_high.style.height = AS_HEIGHT + "px"
        this.canvas_audio_spec_high_ctx = canvas_audio_spec_high.getContext('2d');

        const canvas_audio_spec_low = document.getElementById('audio_spec_low');
        canvas_audio_spec_low.width = AS_WIDTH;
        canvas_audio_spec_low.height = AS_HEIGHT;
        canvas_audio_spec_low.style.top = 800 + "px"
        canvas_audio_spec_low.style.left = 1340 + "px"
        canvas_audio_spec_low.style.width = AS_WIDTH + "px"
        canvas_audio_spec_low.style.height = AS_HEIGHT + "px"
        this.canvas_audio_spec_low_ctx = canvas_audio_spec_low.getContext('2d');

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
        this.audio_timer = setInterval(() => this.changeParameter(), 1000)
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

    // ここでスペクトログラムを描画する予定
    drawSpec() {

        //背面
        // this.canvas_audio_spec_high_ctx.fillStyle = "rgb(200, 200, 200)";
        // this.canvas_audio_spec_high_ctx.fillRect(0, 0, AS_WIDTH, AS_HEIGHT);
        //ストローク
        console.log("freqData.length",this.freqData.length)
        const BIN=64
        const n=this.freqData.length
        const d=n/BIN
        let hist=[]
        for(var i=0;i<BIN*d;i+=d){//各ビンの先頭
            var ave=0;//平均
            for(var j=i;j<i+d;j++){//d個
                ave+=this.freqData[j]
            }
            hist.push(ave/d)
        }
        const wid=this.canvas_audio_spec_low_ctx.width/BIN;
        //const hei=this.canvas_audio_spec_low_ctx.height;
        this.canvas_audio_spec_low_ctx.fillStyle = "rgb(255, 0, 0)";
        this.canvas_audio_spec_high_ctx.fillStyle = "rgb(255, 0, 0)";
        for(var i=0;i<BIN/2;i++){
            this.canvas_audio_spec_low_ctx.fillRect(wid*i,0, wid*(i+1), -hist[i]);
        }
        for(var i=BIN/2;i<BIN;i++){
            this.canvas_audio_spec_high_ctx.fillRect(wid*(i-BIN/2),0, wid*(i-BIN/2+1), -hist[i]);
        }
        console.log("hist",hist)
     }

    changeParameter() {
        this.audio_analyzer.getFloatFrequencyData(this.freqData)
        this.drawSpec()
        this.power_min_val=INIT_FREQ_MIN
        this.power_max_val = INIT_FREQ_MAX
        const start = 500
        const end = 600
        let sum = 0
        for (let i = start; i < end; i += 1) {
            sum += this.freqData[i]
        }
        let val = (sum / (end - start) - this.power_min_val) / (this.power_max_val - this.power_min_val)
        if (val < 0) { val = 0 }
        if (val > 1) { val = 1 }     
        val = MIN_WIND_SPEED + val * (MAX_WIND_SPEED - MIN_WIND_SPEED)
        console.log(this.freqData)
        console.log("val", val);
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
        //this.canvas_wallformat_ctx.fillStyle='rgb(127,127,127)'//(グレー:中間位置)
        //this.canvas_wallformat_ctx.fillStyle='rgb(255,255,255)'//(白:一番飛び出た位置)
        //this.canvas_wallformat_ctx.fillRect(WF_WIDTH_3,0,WF_WIDTH_3*2,WF_HEIGHT)//キネ位置
        this.canvas_wallformat_ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas_wallformat_ctx.fillRect(WF_WIDTH_3*2,0,WF_WIDTH_3*3,WF_HEIGHT)//キネ速度
    }
}

window.onload = () => {
    new Main()
}
