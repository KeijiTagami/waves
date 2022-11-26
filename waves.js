"use strict";

class Main {

    constructor() {
        this.canvas = document.getElementById('simulator');
        this.canvas2 = document.getElementById('wallformat');
        this.canvas2ctx = this.canvas2.getContext('2d');
        this.canvas2ctx.fillStyle='rgb(100,100,100)'//灰色
        this.canvas2ctx.fillRect(0, 0, this.canvas2.width, this.canvas2.height);//ベースラインの色
        this.simulator = new Simulator(this.canvas);
        this.camera_fix = new Camera();
        this.camera = new Camera();
        this.frag = 0;//simulationの一時停止フラグ
        this.counter=0;//カウンター

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

        // window.addEventListener('resize', this.onResize.bind(this));
        // let checkbox=document.getElementById('makeImageCheckbox');
        // let button = document.getElementById('start_stop');
        // button.addEventListener('click', () => {
        //     this.frag = (this.frag + 1) % 2;//1,0の切り替え
        //     if (this.frag) {
        //         const pixels = this.simulator.output(this.camera_fix.getViewMatrix());
        //         const blob = new Blob([pixels])
        //         const link = document.createElement('a')
        //         if(!checkbox.checked)return;
        //         link.download = 'surface.dat'
        //         link.href = URL.createObjectURL(blob)
        //         link.click()
        //         URL.revokeObjectURL(link.href)
        //         console.log(pixels)
        //     }
        // });

        //this.onResize();
        requestAnimationFrame(this.render.bind(this));
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

    onResize() {
        this.simulator.resize(window.innerWidth, window.innerHeight)
        this.canvas2.width = RESOLUTION
        this.canvas2.height = RESOLUTION
    }

    render(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
        this.lastTime = currentTime;
        // //fragはシミュレーションの一時停止フラグ
        // if (!this.frag) {
            
        // }
        this.simulator.update(deltaTime);
        //カメラ2を使った2画面目の描画も行う
        //this.simulator.resize(RESOLUTION, RESOLUTION);
        //this.simulator.render_grayscale(this.camera_fix.getViewMatrix());
        // this.canvas2ctx.clearRect(0, 0, RESOLUTION, RESOLUTION);
        // this.canvas2ctx.drawImage(this.canvas, 0, 0, RESOLUTION, RESOLUTION, 0, 0, RESOLUTION, RESOLUTION);
        // this.simulator.resize(window.innerWidth, window.innerHeight)

        this.simulator.render(this.camera.getViewMatrix(), this.camera.getPosition());
        const pixels = this.simulator.output_height(this.camera_fix.getViewMatrix());
        // if (this.counter==300) {
        //     const blob = new Blob([pixels])
        //     const link = document.createElement('a')
        //     link.download = 'surface.dat'
        //     link.href = URL.createObjectURL(blob)
        //     link.click()
        //     URL.revokeObjectURL(link.href)
        // }
        //壁フォーマットのレンダリング
        const wf_wid=1080*this.canvas2.width/1920//フォーマット全体の幅(2k基準で1080)
        const wf_hei=450*this.canvas2.height/1080//フォーマット全体の高さ(2k基準で450)
        const wf_wid_3=wf_wid/3//一つのフォーマット幅(2k基準で360)
        const resolution=1024;
        // canvasInvisibleに描画
        let canvasInvisible=document.createElement('canvas');
        canvasInvisible.width=resolution;
        canvasInvisible.height=resolution;
        let ctxInv = canvasInvisible.getContext('2d');
        const imageData=ctxInv.createImageData(resolution,resolution);
        for(let i=0; i <imageData.data.length;i+=4){
            const ind=i/4;
            const row=resolution-(ind/resolution)|0;
            const col=ind % resolution;          
            const height=(pixels[(row*resolution+col)]*0.15+0.5)*255;
            imageData.data[i+0]=height;
            imageData.data[i+1]=height;
            imageData.data[i+2]=height;
            imageData.data[i+3]=255;
        }
        ctxInv.putImageData(imageData,0,0);
        
        this.canvas2ctx.fillStyle='rgb(0,0,0)'//黒
        this.canvas2ctx.clearRect(0,0,wf_wid,wf_hei)//壁部分のみ消去
        const scale=30/51;
        this.canvas2ctx.scale(scale,scale);
        this.canvas2ctx.drawImage(canvasInvisible,1/scale*240,1/scale*(-120));
        this.canvas2ctx.scale(1/scale,1/scale);
        this.canvas2ctx.fillStyle='rgb(0,0,0)'//黒：LEDを使わない
        this.canvas2ctx.fillRect(0,0,wf_wid_3,wf_hei)//LED
        
        this.canvas2ctx.fillStyle='rgb(255,255,255)'//(白：最大速度)
        this.canvas2ctx.fillRect(wf_wid_3*2,0,wf_wid_3,wf_hei)//キネ速度
        
        //this.canvas2ctx.fillStyle='rgb(0,255,0)'//緑
        //this.canvas2ctx.fillRect(wf_wid_3,0,wf_wid_3,wf_hei)//キネ位置
        this.counter+=1;
        requestAnimationFrame(this.render.bind(this));
    }

}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
