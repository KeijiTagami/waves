importScripts("./parameters.js")
importScripts("./simulation.js")
importScripts("./camera.js")

var simulator = null
const camera_fix = new Camera()
const camera = new Camera()

const W = OUTPUT_WIDTH + 2 * WHITE_MARGIN
const H = OUTPUT_HEIGHT + 2 * WHITE_MARGIN
const w = OUTPUT_WIDTH
const h = OUTPUT_HEIGHT

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.1.0/dist/tf.min.js")
if (TF_TYPE == "wasm") {
    importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/dist/tf-backend-wasm.min.js")
    tf.wasm.setWasmPaths("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/wasm-out/")
}

tf.setBackend(TF_TYPE).then(() => {
    console.log(tf.getBackend())
    if (TF_TYPE == "wasm") {
        //tf.wasm.setThreadsCount(2)
        console.log(tf.wasm.getThreadsCount())
    }
    tf.loadLayersModel('./lightModel3/model.json').then((model) => {
        addEventListener("message", m => {
            if (m.data.type == "canvas") {
                Simulator.load_gl().then(() => {
                    simulator = new Simulator(m.data.value)
                    postMessage({type: "ready"})
                })
            } else if (m.data.type == "updateSize") {
                camera.changeScale(m.data.value)
                camera_fix.changeScale(m.data.value)
                simulator.setSize(m.data.value);
            } else if (m.data.type == "updateWindSpeed") {
                simulator.setWindSpeed(m.data.value)
            } else if (m.data.type == "updateWindDirection") {
                simulator.setWindDirection(m.data.value)
            } else if (m.data.type == "updateChoppiness") {
                simulator.setChoppiness(m.data.value)
            } else if (m.data.type == "create") {
                const num = m.data.value

                const blue = []
                const wall = []
                const data = []
                for (let i = 0; i < num;  i += 1) {
                    simulator.update(DELTA_TIME)
                    const blueImage = simulator.render(camera.getViewMatrix(), camera.getPosition())
                    blue.push(blueImage)
                    const [wallImage, whitePixels] = simulator.output(camera_fix.getViewMatrix())
                    wall.push(wallImage)
                    if (i % DELTA_WHITE == 0) {
                        data.push(whitePixels)
                    }
                }

                const start = Date.now()
                const n = data.length
                const output_t = tf.tidy(() => {
                    const input = tf.tensor2d(data).reshape([n, H, W, 4]).gather([0, 1, 2], 3)
                    return model.predict(input)
                })
                output_t.data().then(whitePixels => {
                    output_t.dispose()
                    console.log("predict", n, Date.now() - start, "ms")
                    const white = []
                    for (let i = 0; i < n; i += 1) {
                        const z = whitePixels.slice(i * (w * h), (i + 1) * (w * h))
                        const imageData = new ImageData(w, h)
                        for (let y = 0; y < h; y += 1) {
                            for (let x = 0; x < w; x += 1) {
                                imageData.data[4 * (w * (h - y - 1) + x) + 0] = 255
                                imageData.data[4 * (w * (h - y - 1) + x) + 1] = 255
                                imageData.data[4 * (w * (h - y - 1) + x) + 2] = 255
                                imageData.data[4 * (w * (h - y - 1) + x) + 3] = 255 * z[w * y + x]
                            }
                        }
                        for (let j = 0; j < DELTA_WHITE; j += 1) {
                            white.push(imageData)
                        }
                    }
                    const output = []
                    for (let i =0; i < num; i += 1) {
                        output.push([blue[i], white[i], wall[i]])
                    }
                    postMessage({type: "output", value: output})
                })
            }
        })
        postMessage({type: "init"})
    })
})
