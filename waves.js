"use strict";

class Main {

    constructor() {
        this.canvas_blue = document.getElementById('blue_wave');
        this.canvas_blue.width = OUTPUT_WIDTH
        this.canvas_blue.height = OUTPUT_HEIGHT
        this.canvas_blue_ctx = this.canvas_blue.getContext('2d');

        this.canvas_white = document.getElementById('white_wave');
        this.canvas_white.width = OUTPUT_WIDTH
        this.canvas_white.height = OUTPUT_HEIGHT
        this.canvas_white_ctx = this.canvas_white.getContext('2d');

        this.canvas_wall = document.getElementById('wallformat');
        this.canvas_wall.width = OUTPUT_WIDTH + 2 * WHITE_MARGIN
        this.canvas_wall.height = OUTPUT_HEIGHT + 2 * WHITE_MARGIN
        this.canvas_wall_ctx = this.canvas_wall.getContext('2d');
        //this.canvas_wall_ctx.fillStyle='rgb(100,100,100)'//灰色
        //this.canvas_wall_ctx.fillRect(0, 0, this.canvas_wall.width, this.canvas_wall.height);//ベースラインの色を設定

        setupSlider(
            "#size", (e, o) => { this.worker.postMessage({type: "updateSize", value: o.value}) },
            { value: INITIAL_SIZE, min: MIN_SIZE, max: MAX_SIZE, step: 1, precision: 0 });
        setupSlider(
            "#wind-speed", (e, o) => { this.worker.postMessage({type: "updateWindSpeed", value: o.value}) },
            { value: INITIAL_WIND_SPEED, min: MIN_WIND_SPEED, max: MAX_WIND_SPEED, step: 0.1, precision: 1 });
        setupSlider(
            "#wind-direction", (e, o) => { this.worker.postMessage({type: "updateWindDirection", value: o.value}) },
            { value: INITIAL_WIND_DIRECTION, min: -180.0, max: 180.0, step: 1, precision: 0 });
        setupSlider(
            "#choppiness", (e, o) => { this.worker.postMessage({type: "updateChoppiness", value: o.value}) },
            { value: INITIAL_CHOPPINESS, min: MIN_CHOPPINESS, max: MAX_CHOPPINESS, step: 0.1, precision: 1 });

        this.button = document.getElementById('run')
        this.button.addEventListener("click", (e) => {
            if (this.running) {
                this.stop()
            } else {
                this.run()
            }
        })

        this.running = false

        this.images = []

        this.worker = new Worker("worker.js")
        this.worker.addEventListener("message", m => {
            if (m.data.type == "init") {
                const canvas = document.createElement("canvas").transferControlToOffscreen()
                this.worker.postMessage({type: "canvas", value: canvas}, [canvas])
            } else if (m.data.type == "ready") {
                this.run()
            } else if (m.data.type == "output") {
                this.getSimulation(m.data.value)
            }
        })

    }

    run() {
        this.running = true
        this.requestSimulation()
        this.render_interval = null
        this.button.innerText = "stop"
    }

    stop() {
        this.running = false
        clearInterval(this.render_interval)
        this.render_interval = null
        this.button.innerText = "start"
    }

    requestSimulation() {
        if (this.running) {
            if (this.images.length < MAX_STOCK) { 
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
            this.canvas_wall_ctx.putImageData(wall, 0, 0);
        }
    }
}

window.onload = () => {
    new Main()
}
