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
        this.canvas_wall_ctx.fillStyle='rgb(100,100,100)'//灰色
        this.canvas_wall_ctx.fillRect(0, 0, this.canvas_wall.width, this.canvas_wall.height);//ベースラインの色を設定

        this.simulator = new Simulator()
        this.camera_fix = new Camera();
        this.camera = new Camera();

        this.delta_time = DELTA_TIME
        this.slow = SLOW
        this.delta_white = DELTA_WHITE
        this.max_blue =  MAX_BLUE

        this.min_batch = MIN_BATCH
        this.max_batch = MAX_BATCH

        this.running = false

        setupSlider("#size", this.updateSize.bind(this),
            { value: INITIAL_SIZE, min: MIN_SIZE, max: MAX_SIZE, step: 1, precision: 0 });
        setupSlider("#wind-speed", this.updateWindSpeed.bind(this),
            { value: INITIAL_WIND_SPEED, min: MIN_WIND_SPEED, max: MAX_WIND_SPEED, step: 0.1, precision: 1 });
        setupSlider("#wind-direction", this.updateWindDirection.bind(this),
            { value: INITIAL_WIND_DIRECTION, min: -180.0, max: 180.0, step: 1, precision: 0 });
        setupSlider("#choppiness", this.updateChoppiness.bind(this),
            { value: INITIAL_CHOPPINESS, min: MIN_CHOPPINESS, max: MAX_CHOPPINESS, step: 0.1, precision: 1 });
        this.button = document.getElementById('run')
        this.button.addEventListener("click", (e) => {
            if (this.running) {
                this.stop()
            } else {
                this.run()
            }
        })

        this.data = []
        this.wall = []
        this.blue = []
        this.white = []

        this.worker = new Worker("worker.js")
        this.worker.addEventListener("message", m => {
            if (m.data == "initialized") {
                this.requestWhitewave()
            } else {
                this.getWhitewave(m.data)
            }
        })

        this.run()
    }

    run() {
        if (this.running == false) {
            this.button.innerText = "stop"
            this.running = true
            this.timer = Date.now()
            this.blue_counter = 0
            this.requestBluewave()
            this.render()
        }
    }

    stop() {
        this.button.innerText = "start"
        this.running = false
    }

    requestBluewave() {
        if (this.running) {
            if (this.blue.length < this.max_blue) {
                this.simulator.update(this.delta_time)

                const blue = this.simulator.render(this.camera.getViewMatrix(), this.camera.getPosition())
                {
                    const w = OUTPUT_WIDTH
                    const h = OUTPUT_HEIGHT
                    const imageData = this.canvas_blue_ctx.createImageData(w, h)
                    for (var y = 0; y < h; y += 1) {
                        for (var x = 0; x < w; x += 1) {
                            for (var z = 0; z < 4; z += 1) {
                                imageData.data[4 * (w * (h - y - 1) + x) + z] = blue[4 * (w * y + x) + z]
                            }
                        }
                    }
                    this.blue.push(imageData)
                }

                const data = this.simulator.output(this.camera_fix.getViewMatrix())
                {
                    const w = OUTPUT_WIDTH + 2 * WHITE_MARGIN
                    const h = OUTPUT_HEIGHT + 2 * WHITE_MARGIN
                    const imageData = this.canvas_wall_ctx.createImageData(w, h)
                    for (var y = 0; y < h; y += 1) {
                        for (var x = 0; x < w; x += 1) {
                            const pd = w * (h - y - 1) + x
                            const z = 255 * (0.15 * data[(w * y + x) * 4] + 0.5)
                            imageData.data[4 * pd + 0] = z
                            imageData.data[4 * pd + 1] = z
                            imageData.data[4 * pd + 2] = z
                            imageData.data[4 * pd + 3] = 255
                        }
                    }
                    this.wall.push(imageData)
                }

                if (this.blue_counter % this.delta_white == 0) {
                    this.data.push(data)
                }

                this.blue_counter += 1
                console.log("blue", this.blue.length)
            }
            setTimeout(this.requestBluewave.bind(this), 10)
        }
    }

    requestWhitewave() {
        if (this.running) {
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
    }

    getWhitewave(data) {
        const w = OUTPUT_WIDTH
        const h = OUTPUT_HEIGHT
        const n = data[0]
        const image = data[1]
        for (let k = 0; k < n; k += 1) {
            const alpha = image.slice(k * h * w, (k + 1) * h * w)
            const imageData = this.canvas_white_ctx.createImageData(OUTPUT_WIDTH, OUTPUT_HEIGHT)
            for (let y = 0; y < h; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    imageData.data[4 * ((h - y - 1) * w + x) + 0] = 255
                    imageData.data[4 * ((h - y - 1) * w + x) + 1] = 255
                    imageData.data[4 * ((h - y - 1) * w + x) + 2] = 255
                    imageData.data[4 * ((h - y - 1) * w + x) + 3] = 128 * alpha[y * w + x]
                }
            }
            for (var l = 0; l < this.delta_white; l += 1) {
                this.white.push(imageData)
            }
        }
        console.log("white", Date.now() - this.white_timer, this.white.length)
        this.requestWhitewave()
    }

    render() {
        if (this.running) {
            if ((this.blue.length > 0) && (this.white.length > 0) && (this.wall.length > 0)) {
                console.log(this.blue.length, this.white.length)
                const now = Date.now()
                console.log("render", now - this.timer)
                this.timer = now
                const blue = this.blue.shift()
                const white = this.white.shift()
                const wall = this.wall.shift()
                this.canvas_blue_ctx.putImageData(blue, 0, 0)
                this.canvas_white_ctx.putImageData(white, 0, 0);
                this.canvas_wall_ctx.putImageData(wall, 0, 0);
                setTimeout(this.render.bind(this), 1000 * this.slow * this.delta_time)
            } else {
                setTimeout(this.render.bind(this), 10)
            }
        }
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
}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
