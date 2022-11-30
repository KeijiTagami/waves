"use strict";

class Main {

    constructor() {
        this.canvas = document.getElementById('simulator');
        this.canvas2 = document.getElementById('wallformat');
        this.canvas2ctx = this.canvas2.getContext('2d');
        this.canvas2ctx.fillStyle='rgb(100,100,100)'//灰色
        this.canvas2ctx.fillRect(0, 0, this.canvas2.width, this.canvas2.height);//ベースラインの色を設定
        this.canvas_blue = document.getElementById('blue_wave');
        this.canvas_blue_ctx =this.canvas_blue.getContext('2d');
        this.canvas_white = document.getElementById('white_wave');
        this.canvas_white_ctx = this.canvas_white.getContext('2d');
        this.simulator = new Simulator(this.canvas);
        this.camera_fix = new Camera();
        this.camera = new Camera();
        this.delta_time = 0.1
        this.slow = 20
        this.delta_white = 1
        this.min_batch = 3 
        this.max_batch = 5
        this.max_blue = 20

        setupSlider("#size", this.updateSize.bind(this),
            { value: INITIAL_SIZE, min: MIN_SIZE, max: MAX_SIZE, step: 1, precision: 0 });
        setupSlider("#wind-speed", this.updateWindSpeed.bind(this),
            { value: INITIAL_WIND_SPEED, min: MIN_WIND_SPEED, max: MAX_WIND_SPEED, step: 0.1, precision: 1 });
        setupSlider("#wind-direction", this.updateWindDirection.bind(this),
            { value: INITIAL_WIND_DIRECTION, min: -180.0, max: 180.0, step: 1, precision: 0 });
        setupSlider("#choppiness", this.updateChoppiness.bind(this),
            { value: INITIAL_CHOPPINESS, min: MIN_CHOPPINESS, max: MAX_CHOPPINESS, step: 0.1, precision: 1 });

        this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

        this.data = []
        this.wall = []
        this.blue = []
        this.white = []

        this.worker = new Worker("worker.js")
        this.worker.addEventListener("message", m => {
            //console.log("event", m)
            if (m.data == "initialized") {
                this.requestWhitewave()
            } else {
                this.getWhitewave(m.data)
            }
        })

        this.timer = Date.now()
        this.blue_counter = 0
        this.requestBluewave()
        this.render()
    }

    requestBluewave() {
        if (this.blue.length < this.max_blue) {
            this.simulator.update(this.delta_time)
            this.blue.push(this.simulator.render(this.camera.getViewMatrix(), this.camera.getPosition()))
            const data = this.simulator.output(this.camera_fix.getViewMatrix())
            this.wall.push(data)
            if (this.blue_counter % this.delta_white == 0) {
                this.data.push(data)
            }
            this.blue_counter += 1
            console.log("blue", this.blue.length)
        }
        setTimeout(this.requestBluewave.bind(this), 10)
    }

    requestWhitewave() {
        if (this.data.length < this.min_batch) {
            setTimeout(this.requestWhitewave.bind(this), 10)
            return
        }
        const data = []
        for (var i = 0; i < this.max_batch; i += 1) {
            if (this.data.length == 0) {
                break
            }
            data.push(this.data.shift())
        }
        this.white_timer = Date.now()
        this.worker.postMessage(data)
        console.log("post", this.data.length, data.length)
    }

    getWhitewave(data) {
        const n = data[0]
        const image = data[1]
        //console.log("get", n, Date.now())
        //console.log(image.length, image)
        const m = OUTPUT_WIDTH * OUTPUT_HEIGHT
        for (var i = 0; i < n; i += 1) {
            const imagei = image.slice(i * m, (i + 1) * m)
            //console.log(imagei)
            for (var j = 0; j < this.delta_white; j += 1) {
                this.white.push(imagei)
            }
        }
        //console.log("white", this.blue.length, this.white.length, this.wall.length, this.data.length)
        console.log("white", Date.now() - this.white_timer, this.white.length)
        this.requestWhitewave()
    }

    render() {
        if ((this.blue.length > 0) && (this.white.length > 0) && (this.wall.length > 0)) {
            const now = Date.now()
            console.log("render", now - this.timer)
            this.timer = now
            const blue = this.blue.shift()
            const white = this.white.shift()
            const wall = this.wall.shift()
            this.setBluewave(blue)
            this.setWhitewave(white)
            //this.setWall(wall)
            setTimeout(this.render.bind(this), 1000 * this.slow * this.delta_time)
        } else {
            setTimeout(this.render.bind(this), 10)
        }
    }

    setBluewave(image) {
        const imageData = this.canvas_blue_ctx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);//canvasに配置するデータ
        for (let i = 0; i < OUTPUT_WIDTH; i += 1) {
            for (let j = 0; j < OUTPUT_HEIGHT; j += 1) {
                for (let k = 0; k < 4; k += 1) {
                    imageData.data[4 * (j * OUTPUT_WIDTH + i) + k] = 255 * image[4 * ((j + WHITE_MARGIN) * (OUTPUT_WIDTH + 2 * WHITE_MARGIN) + (i + WHITE_MARGIN)) + k]
                }
            }
        }
        this.canvas_blue_ctx.putImageData(imageData, 0, 0)
    }

    setWhitewave(alpha) {
        const imageData = this.canvas_white_ctx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT);//canvasに配置するデータ
        //console.log("white", alpha)
        for (let i = 0; i < OUTPUT_WIDTH; i += 1) {
            for (let j = 0; j < OUTPUT_HEIGHT; j += 1) {
                imageData.data[4 * (j * OUTPUT_WIDTH + i) + 0] = 255
                imageData.data[4 * (j * OUTPUT_WIDTH + i) + 1] = 255
                imageData.data[4 * (j * OUTPUT_WIDTH + i) + 2] = 255
                imageData.data[4 * (j * OUTPUT_WIDTH + i) + 3] = alpha[j * OUTPUT_WIDTH + i] * 255
            }
        }
        this.canvas_white_ctx.putImageData(imageData, 0, 0);
    }
    
    setWall(pixels){
        //壁フォーマットのレンダリング
        const wf_wid=1080//フォーマット全体の幅(2k基準で1080)
        const wf_hei=450//フォーマット全体の高さ(2k基準で450)
        const wf_wid_3=wf_wid/3//一つのフォーマット幅(2k基準で360)
        const resolution=1024;

        // canvasInvisibleに描画
        let canvasInvisible=document.createElement('canvas');
        canvasInvisible.width=resolution;
        canvasInvisible.height=resolution;
        let ctxInv = canvasInvisible.getContext('2d');
        const imageData=ctxInv.createImageData(resolution,resolution);//canvasに配置する高さデータ
        for(let i=0; i <imageData.data.length;i+=4){//高さデータを設定する
            const ind=i/4;
            const row=resolution-(ind/resolution)|0;
            const col=ind % resolution;          
            const height=(pixels[(row*resolution+col)*4]*0.15+0.5)*255;//法線の分は飛ばすので*4
            imageData.data[i+0]=height;
            imageData.data[i+1]=height;
            imageData.data[i+2]=height;
            imageData.data[i+3]=255;
        }
        ctxInv.putImageData(imageData,0,0);//不可視キャンバス
        
        this.canvas2ctx.fillStyle='rgb(0,0,0)'//黒
        this.canvas2ctx.clearRect(0,0,wf_wid,wf_hei)//壁部分のみ消去
        const scale=30/51;//プロジェクターの系から壁の系へのスケーリング
        this.canvas2ctx.scale(scale,scale);
        this.canvas2ctx.drawImage(canvasInvisible,1/scale*240,1/scale*(-120));
        this.canvas2ctx.scale(1/scale,1/scale);
        this.canvas2ctx.fillStyle='rgb(0,0,0)'//黒：LEDを使わない
        this.canvas2ctx.fillRect(0,0,wf_wid_3,wf_hei)//LED
        
        this.canvas2ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas2ctx.fillRect(wf_wid_3*2,0,wf_wid_3,wf_hei)//キネ速度
    }

    updateSize(e, o) {
        this.camera.changeScale(o.value);
        this.camera_fix.changeScale(o.value);
        this.simulator.setSize(o.value);
    }

    updateWindSpeed(e, o) {
        this.simulator.setWindSpeed(o.value);
    }

    updateWindDirection(e, o) {
        this.simulator.setWindDirection(o.value);
    }

    updateChoppiness(e, o) {
        this.simulator.setChoppiness(o.value);
    }

    onMouseDown(event) {
        event.preventDefault();
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.orbiting = true;
    }

    onMouseUp(event) {
        event.preventDefault();
        this.orbiting = false;
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.orbiting) {
            this.camera.changeAzimuth((event.clientX - this.lastMouseX) / this.canvas.width * SENSITIVITY);
            this.camera.changeElevation((event.clientY - this.lastMouseY) / this.canvas.height * SENSITIVITY);
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }
}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
