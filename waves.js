"use strict";

class Main {

    constructor() {
        this.canvas = document.getElementById('simulator');
        this.canvas2 = document.getElementById('simulator2');
        this.canvas2ctx = this.canvas2.getContext('2d');
        this.simulator = new Simulator(this.canvas);
        this.camera_fix = new Camera();
        this.camera = new Camera();
        this.frag = 0;//simulationの一時停止フラグ

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
                const blob = new Blob([pixels])
                const link = document.createElement('a')
                if(!checkbox.checked)return;
                link.download = 'surface.dat'
                link.href = URL.createObjectURL(blob)
                link.click()
                URL.revokeObjectURL(link.href)
<<<<<<< HEAD
                
                console.log(pixels[0]);
=======
>>>>>>> c436ffd448e49c6d6a8653ecf60dbcfaca2b11a6
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
        this.canvas2.width = RESOLUTION
        this.canvas2.height = RESOLUTION
    }

    render(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
        this.lastTime = currentTime;
        //fragはシミュレーションの一時停止フラグ
        if (!this.frag) {
            this.simulator.update(deltaTime);
        }
        //カメラ2を使った2画面目の描画も行う
        this.simulator.resize(RESOLUTION, RESOLUTION);
<<<<<<< HEAD
        this.simulator.render_grayscale();
=======
        this.simulator.render_grayscale(this.camera_fix.getViewMatrix());
>>>>>>> c436ffd448e49c6d6a8653ecf60dbcfaca2b11a6
        this.canvas2ctx.clearRect(0, 0, RESOLUTION, RESOLUTION);
        this.canvas2ctx.drawImage(this.canvas, 0, 0, RESOLUTION, RESOLUTION, 0, 0, RESOLUTION, RESOLUTION);
        this.simulator.resize(window.innerWidth, window.innerHeight)

        this.simulator.render(this.camera.getViewMatrix(), this.camera.getPosition());
        
        requestAnimationFrame(this.render.bind(this));
    }

}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
