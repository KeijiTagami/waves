"use strict";

class Main {

    constructor() {
        const canvas_blue = document.getElementById('blue_wave');
        canvas_blue.width = OUTPUT_WIDTH
        canvas_blue.height = OUTPUT_HEIGHT
        canvas_blue.top = OUTPUT_WIDTH
        canvas_blue.style.top = 10 + "pt"
        canvas_blue.style.left = 50 + "pt"
        canvas_blue.style.width = OUTPUT_WIDTH + "pt"
        canvas_blue.style.height = OUTPUT_HEIGHT + "pt"
        this.canvas_blue_ctx = canvas_blue.getContext('2d');

        const canvas_white = document.getElementById('white_wave');
        canvas_white.width = OUTPUT_WIDTH
        canvas_white.height = OUTPUT_HEIGHT
        canvas_white.style.top = 10 + "pt"
        canvas_white.style.left = 50 + "pt"
        canvas_white.style.width = OUTPUT_WIDTH + "pt"
        canvas_white.style.height = OUTPUT_HEIGHT + "pt"
        this.canvas_white_ctx = canvas_white.getContext('2d');

        const canvas_wall = document.getElementById('wallformat');
        canvas_wall.width = OUTPUT_WIDTH
        canvas_wall.height = OUTPUT_HEIGHT
        canvas_wall.style.top = (10 + OUTPUT_HEIGHT) + "pt"
        canvas_wall.style.left = 50 + "pt"
        canvas_wall.style.width = OUTPUT_WIDTH + "pt"
        canvas_wall.style.height = OUTPUT_HEIGHT + "pt"
        this.canvas_wall_ctx = canvas_wall.getContext('2d');

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
        const canvas1 = document.createElement("canvas").transferControlToOffscreen()
        canvas1.width = OUTPUT_WIDTH
        canvas1.height = OUTPUT_HEIGHT
        const canvas2 = document.createElement("canvas").transferControlToOffscreen()
        canvas2.width = OUTPUT_WIDTH
        canvas2.height = OUTPUT_HEIGHT
        this.worker.postMessage({type: "canvas", canvas1: canvas1, canvas2: canvas2}, [canvas1, canvas2])
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
        const min_val = -70
        const max_val = -20
        var val = this.freqData[100]
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
                this.canvas_wall_ctx.putImageData(wall, 0, 0);
            }
        }
    }
}

window.onload = () => {
    new Main()
}
