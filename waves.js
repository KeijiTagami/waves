"use strict";

class Main {

    constructor() {
        const canvas = document.getElementById('simulator');
        this.simulator = new Simulator(canvas);
        this.camera = new Camera();

        setupSlider("#size", this.updateSize.bind(this),
            {value: INITIAL_SIZE, min: MIN_SIZE, max: MAX_SIZE, step: 1, precision: 0});
        setupSlider("#wind-speed", this.updateWindSpeed.bind(this),
            {value: INITIAL_WIND_SPEED, min: MIN_WIND_SPEED, max: MAX_WIND_SPEED, step: 0.1, precision: 1});
        setupSlider("#wind-direction", this.updateWindDirection.bind(this),
            {value: INITIAL_WIND_DIRECTION, min: -180.0, max: 180.0, step: 1, precision: 0});
        setupSlider("#choppiness", this.updateChoppiness.bind(this),
            {value: INITIAL_CHOPPINESS, min: MIN_CHOPPINESS, max: MAX_CHOPPINESS, step: 0.1, precision: 1});

        canvas.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));

        window.addEventListener('resize', this.onResize.bind(this));
        this.onResize();
        requestAnimationFrame(this.render.bind(this));
    }

    updateSize(e, o) {
        this.camera.changeScale(o.value);
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
            this.camera.changeAzimuth((event.clientX - this.lastMouseX) / this.width * SENSITIVITY);
            this.camera.changeElevation((event.clientY - this.lastMouseY) / this.height * SENSITIVITY);
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.projectionMatrix = m4.perspective(FOV, this.width / this.height, NEAR, FAR);
        this.simulator.resize(this.width, this.height);
    }

    render(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
        this.lastTime = currentTime;
        this.simulator.update(deltaTime);
        this.simulator.render(this.projectionMatrix, this.camera.getViewMatrix(), this.camera.getPosition());
        requestAnimationFrame(this.render.bind(this));
    }

}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
