"use strict";

class Main {

    constructor() {
        this.canvas = document.getElementById('simulator');
        this.canvas3 = document.getElementById('white_wave');
        this.canvas3ctx =this.canvas3.getContext('2d');
        this.simulator = new Simulator(this.canvas);
        this.camera_fix = new Camera();
        this.camera = new Camera();
        this.frag = 0;//simulationの一時停止フラグ
        this.counter=0;
        tf.loadLayersModel('./lightModel3/model.json').then((m)=>{
            this.model=m
        })//Pythonの学習済みモデル
        
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

        window.addEventListener('resize', this.onResize.bind(this));
        let checkbox=document.getElementById('makeImageCheckbox');
        let button = document.getElementById('start_stop');
        button.addEventListener('click', () => {
            this.frag = (this.frag + 1) % 2;//1,0の切り替え
            if (this.frag) {
                const pixels = this.simulator.output(this.camera_fix.getViewMatrix());
                const x = tf.tensor1d(pixels).reshape([1, OUTPUT_SIZE, OUTPUT_SIZE, 4]).gather([0,1,2],3);
                const y = this.model.predict(x).reshape([912,912]).arraySync();
                //console.log(y)
                let canvasInvisible=document.createElement('canvas');
                canvasInvisible.width=912;
                canvasInvisible.height=912;
                let ctxInv = canvasInvisible.getContext('2d');
                const imageData=ctxInv.createImageData(912,912 );//canvasに配置する高さデータ
                for(let i=0; i <imageData.data.length;i+=4){//高さデータを設定する
                    const ind=i/4;
                    const row=(ind/912)|0;
                    const col=ind % 912;          
                    const alpha=y[row][col]*255;
                    imageData.data[i+0]=255;
                    imageData.data[i+1]=255;
                    imageData.data[i+2]=255;
                    imageData.data[i+3]=alpha;
                }
                ctxInv.putImageData(imageData,0,0);//不可視キャンバス
                const scale=860/912;//プロジェクターの系から壁の系へのスケーリング
                this.canvas3ctx.scale(scale,scale);
                this.canvas3ctx.putImageData(imageData,0,0);
                //this.canvas3ctx.drawImage(canvasInvisible,0,0);
            }
        });

        this.onResize();
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

    }

    render(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
        this.lastTime = currentTime;
        if(this.counter<100){
            requestAnimationFrame(this.render.bind(this));
            this.counter+=1
            return;
        }
        //fragはシミュレーションの一時停止フラグ
        if (!this.frag) {
            this.simulator.update(deltaTime);
        }
        
        this.simulator.render(this.camera.getViewMatrix(), this.camera.getPosition());
        if(this.counter%5==0){
        const pixels = this.simulator.output(this.camera_fix.getViewMatrix());
        const x = tf.tensor1d(pixels).reshape([1, OUTPUT_SIZE, OUTPUT_SIZE, 4]).gather([0,1,2],3);
        const y = this.model.predict(x).reshape([912,912]).arraySync();
        let canvasInvisible=document.createElement('canvas');
        canvasInvisible.width=912;
        canvasInvisible.height=912;
        let ctxInv = canvasInvisible.getContext('2d');
        const imageData=ctxInv.createImageData(912,912 );//canvasに配置する高さデータ
        for(let i=0; i <imageData.data.length;i+=4){//高さデータを設定する
                    const ind=i/4;
                    const row=(ind/912)|0;
                    const col=ind % 912;          
                    const alpha=y[row][col]*255;
                    imageData.data[i+0]=255;
                    imageData.data[i+1]=255;
                    imageData.data[i+2]=255;
                    imageData.data[i+3]=alpha;
        }
        ctxInv.putImageData(imageData,0,0);//不可視キャンバス
        const scale=860/912;//プロジェクターの系から壁の系へのスケーリング
        this.canvas3ctx.scale(scale,scale);
        this.canvas3ctx.putImageData(imageData,0,0);
        this.canvas3ctx.drawImage(canvasInvisible,0,0);
        this.canvas3ctx.scale(1/scale,1/scale);
        }
        requestAnimationFrame(this.render.bind(this));
        this.counter+=1;
    }

}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
