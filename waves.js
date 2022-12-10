"use strict";

class Main {

    constructor() {
        const wave_offsetx=((1920-WAVE_WIDTH*STYLEX_ADJUST)/2+7);//波を1920*1080スクリーンの中心に配置
        const wave_offsety=(1080-WAVE_HEIGHT)/2+52*2;//壁にフィットさせるときは2壁分(52px*2)下にずらす
        const canvas_blue = document.getElementById('blue_wave');
        canvas_blue.width = OUTPUT_WIDTH
        canvas_blue.height = OUTPUT_HEIGHT
        canvas_blue.style.top = wave_offsety + "px"
        canvas_blue.style.left = wave_offsetx + "px"
        canvas_blue.style.width = WAVE_WIDTH*STYLEX_ADJUST + "px"
        canvas_blue.style.height = WAVE_HEIGHT + "px"
        this.canvas_blue_ctx = canvas_blue.getContext('2d');

        const canvas_white = document.getElementById('white_wave');
        canvas_white.width = OUTPUT_WIDTH
        canvas_white.height = OUTPUT_HEIGHT
        canvas_white.style.top = wave_offsety + "px"
        canvas_white.style.left = wave_offsetx + "px"
        canvas_white.style.width = WAVE_WIDTH*STYLEX_ADJUST + "px"
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
        canvas_audio_spec_high.style.top = 1080-AS_HEIGHT-100 + "px"
        canvas_audio_spec_high.style.left = 1920-AS_WIDTH + "px"
        canvas_audio_spec_high.style.width = AS_WIDTH + "px"
        canvas_audio_spec_high.style.height = AS_HEIGHT + "px"
        this.canvas_audio_spec_high_ctx = canvas_audio_spec_high.getContext('2d');

        const canvas_audio_spec_low = document.getElementById('audio_spec_low');
        canvas_audio_spec_low.width = AS_WIDTH;
        canvas_audio_spec_low.height = AS_HEIGHT;
        canvas_audio_spec_low.style.top = 1080-AS_HEIGHT-100 + "px"
        canvas_audio_spec_low.style.left = 0 + "px"
        canvas_audio_spec_low.style.width = AS_WIDTH + "px"
        canvas_audio_spec_low.style.height = AS_HEIGHT + "px"
        this.canvas_audio_spec_low_ctx = canvas_audio_spec_low.getContext('2d');

        const text1=document.getElementById('LOW');
        text1.style.fontSize=40+"px"
        text1.style.top=parseInt(canvas_audio_spec_low.style.top)+AS_HEIGHT+"px";
        text1.style.left=parseInt(canvas_audio_spec_low.style.left)+AS_WIDTH/2-parseInt(text1.style.fontSize)/2+"px";

        const text2=document.getElementById('HIGH');
        text2.style.fontSize=40+"px"
        text2.style.top=parseInt(canvas_audio_spec_high.style.top)+AS_HEIGHT+"px";
        text2.style.left=parseInt(canvas_audio_spec_high.style.left)+AS_WIDTH/2-parseInt(text2.style.fontSize)/2+"px";
        // 左上に配置
        // const text2=document.getElementById('HIGH');
        // text2.style.fontSize=40+"px"
        // text2.style.top=parseInt(canvas_audio_spec_high.style.top)-parseInt(text2.style.fontSize)+"px";
        // text2.style.left=canvas_audio_spec_high.style.left;

        //風スライダのセット
        this.slider_wind=document.getElementById('windspeedSlider')
        this.slider_wind.min=MIN_WIND_SPEED;
        this.slider_wind.max=MAX_WIND_SPEED;
        this.slider_wind.step=0.01
        this.slider_wind.value=INITIAL_WIND_SPEED;
        //choppinessスライダのセット
        this.slider_choppiness=document.getElementById('choppinessSlider')
        this.slider_choppiness.min=MIN_CHOPPINESS;
        this.slider_choppiness.max=MAX_CHOPPINESS;
        this.slider_choppiness.step=0.01
        this.slider_choppiness.value=INITIAL_CHOPPINESS;

        this.oldWindspeed=INITIAL_WIND_SPEED
        this.oldChoppiness=INITIAL_CHOPPINESS

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
        this.audio_timer = setInterval(() => this.changeParameter(), 50)
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
    //音のヒストグラムを得る
    getHistGram(){
        const n=HIST_END-HIST_START
        const d=parseInt(n/BIN)
        this.hist=[]
        for(var i=0;i<BIN*d;i+=d){//各ビンの先頭
            var ave=0;//平均
            for(var j=i+HIST_START;j<i+d;j++){//d個
                ave+=this.freqData[j]
            }
            const val=this.normalize(ave/d,DECIBEL_MIN,DECIBEL_MAX)
            //console.log("val",i,val)
            this.hist.push(val)//平均値をDECIBELの範囲で調整
        }
        //console.log("hist",this.hist)
    }
    // ここでスペクトログラムを描画する
    drawHist() {
        const wid=AS_WIDTH/BIN*2;
        //const hei=this.canvas_audio_spec_low_ctx.height;
        //console.log("wid",wid);
        // this.canvas_audio_spec_low_ctx.fillStyle = "rgba(0, 0, 0,0)";
        // this.canvas_audio_spec_high_ctx.fillStyle = "rgba(0, 0, 0,0)";
        // this.canvas_audio_spec_low_ctx.fillRect(0, 0, AS_WIDTH, AS_HEIGHT);
        // this.canvas_audio_spec_high_ctx.fillRect(0, 0, AS_WIDTH, AS_HEIGHT);
        this.canvas_audio_spec_low_ctx.clearRect(0,0,AS_WIDTH,AS_HEIGHT)
        this.canvas_audio_spec_high_ctx.clearRect(0,0,AS_WIDTH,AS_HEIGHT)
        this.canvas_audio_spec_low_ctx.fillStyle = "rgba(255, 255, 255,1)";
        this.canvas_audio_spec_high_ctx.fillStyle = "rgba(255, 255, 255,1)";
        this.ave_hist_low=0;//ついでにヒストグラムごとの平均も計算
        this.ave_hist_high=0;
        this.max_hist_low=0
        this.max_hist_high=0
        for(var i=0;i<BIN/2;i++){
            this.canvas_audio_spec_low_ctx.fillRect(wid*i,AS_HEIGHT,wid*HIST_MARGIN, AS_HEIGHT*-this.hist[i]);
            this.ave_hist_low+=this.hist[i]
            if(this.max_hist_low<this.hist[i])
                this.max_hist_low=this.hist[i]
            //console.log("wid*i",wid*i)
        }
        this.ave_hist_low/=BIN/2;
        for(var i=BIN/2;i<BIN;i++){
            this.canvas_audio_spec_high_ctx.fillRect(wid*(i-BIN/2),AS_HEIGHT, wid*HIST_MARGIN, -AS_HEIGHT*this.hist[i]);
            this.ave_hist_high+=this.hist[i]
            if(this.max_hist_high<this.hist[i])
                this.max_hist_high=this.hist[i]
        }
        this.ave_hist_high/=BIN/2;
        //requestAnimationFrame(this.drawSpec)
        //console.log("hist",hist)
    }
    
    adjustNewParameter(x,xold,a){
        if (xold<x)
            return x
        return xold+a*(x-xold)
    }
     
    changeParameter() {
        this.audio_analyzer.getFloatFrequencyData(this.freqData)
        this.getHistGram()//FreqDataを正規化、平均化したBIN次元のヒストグラムを作る
        this.drawHist()//ヒストグラムをcanvasに描画(高音域,低音域の平均も計算)
        //平均
        //let newWindSpeed=this.ave_hist_low*(MAX_WIND_SPEED-MIN_WIND_SPEED)+MIN_WIND_SPEED
        //最大
        let newWindSpeed=this.max_hist_low*(MAX_WIND_SPEED-MIN_WIND_SPEED)+MIN_WIND_SPEED
        newWindSpeed=this.adjustNewParameter(newWindSpeed,this.oldWindspeed,DECREASE_ALPHA)
        this.oldWindspeed=newWindSpeed
        console.log("windspeed",newWindSpeed)
        const id_wind=document.getElementById('windspeedValue')
        id_wind.innerHTML=Math.round(newWindSpeed * Math.pow(10, 2) ) / Math.pow(10, 2);
        this.slider_wind.value=newWindSpeed;
        //平均
        //let newChoppiness=this.ave_hist_high*(MAX_CHOPPINESS-MIN_CHOPPINESS)+MIN_CHOPPINESS
        //最大
        let newChoppiness=this.max_hist_high*(MAX_CHOPPINESS-MIN_CHOPPINESS)+MIN_CHOPPINESS
        newChoppiness=this.adjustNewParameter(newChoppiness,this.oldChoppiness,DECREASE_ALPHA)
        this.oldChoppiness=newChoppiness
        console.log("choppiness",newChoppiness)
        this.slider_choppiness.value=newChoppiness;
        const id_chop=document.getElementById('choppinessValue')
        id_chop.innerHTML=Math.round(newChoppiness * Math.pow(10, 2) ) / Math.pow(10, 2);
        //console.log("val", val);
        this.worker.postMessage({type: "updateWindSpeed", value: newWindSpeed})
        this.worker.postMessage({type: "updateChoppiness", value: newChoppiness})
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
    normalize(x,m,M){
        return this.clamp((x-m)/(M-m),0.0,1.0)
    }
    clamp(x,m,M){
        if(M<x)
            x=M
        if(x<m)
            x=m
        return x
    }
}

window.onload = () => {
    new Main()
}
