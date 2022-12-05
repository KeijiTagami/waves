"use strict";

class Main {

    constructor() {
        const canvas_blue = document.getElementById('blue_wave');
        canvas_blue.width = OUTPUT_WIDTH
        canvas_blue.height = OUTPUT_HEIGHT
        this.canvas_blue_ctx = canvas_blue.getContext('2d');

        const canvas_white = document.getElementById('white_wave');
        canvas_white.width = OUTPUT_WIDTH
        canvas_white.height = OUTPUT_HEIGHT
        this.canvas_white_ctx = canvas_white.getContext('2d');

        const canvas_wall = document.getElementById('wallformat');//壁のキャンバス
        canvas_wall.width= WF_WID;
        canvas_wall.height=WF_HEI;
        this.setWallInit(canvas_wall);
        //オフスクリーンキャンバスのセッティング（こいつに高さデータを描画し、スケーリングしたものをcanvas_wallに貼り付ける）
        this.canvasInvisible=document.createElement('canvas');
        this.canvasInvisible.width=OUTPUT_WIDTH + 2 * WHITE_MARGIN;
        this.canvasInvisible.height=OUTPUT_HEIGHT + 2 * WHITE_MARGIN;
        this.ctxInv = this.canvasInvisible.getContext('2d');
        

        this.running = false
        this.images = []

        this.worker = new Worker("worker.js")
        this.worker.addEventListener("message", m => {
            if (m.data.type == "init") {
                const canvas = document.createElement("canvas").transferControlToOffscreen()
                this.worker.postMessage({type: "canvas", value: canvas}, [canvas])
            } else if (m.data.type == "ready") {
                this.setup()
            } else if (m.data.type == "output") {
                this.getSimulation(m.data.value)
            }
        })
        canvas_white.addEventListener('click',(e)=>{
            this.hBgm=document.querySelector("#high_sound");
            this.lBgm=document.querySelector("#low_sound");
            this.hBgm.play();
            this.hBgm.volume=0;
            this.lBgm.play();
            this.hBgm.volume=1;

        },false);

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
                
    }
    setWallInit(canvas_wall){
        this.canvas_wall_ctx = canvas_wall.getContext('2d');
        // this.canvas_wall_ctx.fillStyle='rgb(100,100,100)'//灰色
        // this.canvas_wall_ctx.fillRect(0, 0, canvas_wall.width, canvas_wall.height);//ベースラインの色を設定
        this.canvas_wall_ctx.fillStyle='rgb(0,0,0)'//黒：LEDを使わない
        this.canvas_wall_ctx.fillRect(0,0,WF_WID_3,WF_HEI)//LED
        this.canvas_wall_ctx.fillStyle='rgb(127,127,127)'//(グレー:中間位置)
        this.canvas_wall_ctx.fillRect(WF_WID_3,0,WF_WID_3*2,WF_HEI)//キネ位置
        this.canvas_wall_ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas_wall_ctx.fillRect(WF_WID_3*2,0,WF_WID_3,WF_HEI)//キネ速度
    }
    setWall(){
        this.canvas_wall_ctx.scale(WALL_SCALE,WALL_SCALE);
        this.canvas_wall_ctx.drawImage(this.canvasInvisible,1/WALL_SCALE*240.0,1/WALL_SCALE*(-120));
        this.canvas_wall_ctx.scale(1/WALL_SCALE,1/WALL_SCALE);
        this.canvas_wall_ctx.fillStyle='rgb(0,0,0)'//黒：LEDを使わない
        this.canvas_wall_ctx.fillRect(0,0,WF_WID_3,WF_HEI)//LED
        this.canvas_wall_ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas_wall_ctx.fillRect(WF_WID_3*2,0,WF_WID_3,WF_HEI)//キネ速度
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
        const min_val =-160 //-70
        const max_val =-100 //-20
        var val = this.freqData[100]

        console.log(val);
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
                this.ctxInv.putImageData(wall, 0, 0);//高さをオフスクリーンに描画
                this.setWall();//高さデータを壁にセットする
                
            }
        }
    }
}

window.onload = () => {
    new Main()
}
