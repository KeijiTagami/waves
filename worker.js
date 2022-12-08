importScripts("./parameters.js")

importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@4.1.0/dist/tf-core.min.js")
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-layers@4.1.0/dist/tf-layers.min.js")
if (TF_TYPE == "wasm") {
    importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/dist/tf-backend-wasm.min.js")
    tf.wasm.setWasmPaths("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/wasm-out/")
}
if (TF_TYPE.endsWith("webgl")) {
    importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.1.0/dist/tf-backend-webgl.min.js")
}

importScripts("./simulation.js")
importScripts("./camera.js")

let simulator = null
let model = null
const camera_fix = new Camera()
const camera = new Camera()

addEventListener("message", m => {
    if (m.data.type == "canvas") {
        const canvas1 = new OffscreenCanvas(W, H)
        const canvas2 = new OffscreenCanvas(w, h)
        on_canvas(canvas1, canvas2)
    } else if (m.data.type == "create") {
        create(m.data.value)
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
    }
})

async function on_canvas(canvas1, canvas2) {
    const gl = canvas1.getContext("webgl2")
    if (TF_TYPE.endsWith("-webgl")) {
        const kernels = tf.getKernelsForBackend("webgl")
        kernels.forEach(kernelConfig => {
            tf.registerKernel({...kernelConfig, backendName: TF_TYPE})
        })
        const context = tf.GPGPUContext(gl)
        const customBackend = new tf.MathBackendWebGL(context)
        tf.registerBackend(TF_TYPE, () => customBackend)
    }
    await tf.setBackend(TF_TYPE)
    console.log(tf.getBackend())
    if (TF_TYPE == "wasm") {
        //tf.wasm.setThreadsCount(2)
        console.log(tf.wasm.getThreadsCount())
    }
    model = await tf.loadLayersModel('./tfjsModel/'+MODEL_NAME+'/model.json')//ここで使うモデルを指定
    console.log(model)
    await Simulator.load_gl()
    simulator = new Simulator(gl, canvas2)
    postMessage({type: "ready"})
}

async function create(num) {
    const blue = []
    const wall = []
    const data = []
    for (let i = 0; i < num;  i += 1) {
        for (let j = 0; j < DELTA_WHITE; j += 1) {
            simulator.update(DELTA_TIME)
            const blueImage = simulator.render(camera.getViewMatrix(), camera.getPosition())
            blue.push(blueImage)
            const pixels = simulator.output(camera_fix.getViewMatrix())
            const wallImage = new ImageData(w, h)
            for (let y = 0; y < h; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    const pd = w * (h - y - 1) + x
                    const z = 255 * (0.15 * pixels[(W * (y + M) + (x + M)) * 4] + 0.6)
                    wallImage.data[4 * pd + 0] = z
                    wallImage.data[4 * pd + 1] = z
                    wallImage.data[4 * pd + 2] = z
                    wallImage.data[4 * pd + 3] = 255
                }
            }
            wall.push(wallImage)

            if (j == 0) {
                if (TF_TYPE.endsWith("xxx-webgl")) {
                    const texture = simulator.outputFramebuffer.textures[0]
                    data.push(tf.tensor({texture, witdh: W, height: H, channels: "RGBA"}, [H, W, 4]).clone())
                } else {
                    data.push(pixels)
                }
            }
        }
    }
    console.log(data)

    const start = Date.now()
    const output_t = tf.tidy(() => {
        const n = data.length
        const x = tf.tensor2d(data)
        const y = tf.reshape(x, [n, H, W, 4])
        const z = tf.gather(y, [0, 1, 2], 3)
        return model.predictOnBatch(z)
    })
    const whitePixels = await output_t.data()
    tf.print(output_t.shape)
    output_t.dispose()
    console.log("predict", num, Date.now() - start, "ms")
    const white = []
    for (let i = 0; i < num; i += 1) {
        const z = whitePixels.slice(i * (w * h), (i + 1) * (w * h))
        const imageData = new ImageData(w, h)
        for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
                const pd = w * (h - y - 1) + x
                imageData.data[4 * pd + 0] = 255
                imageData.data[4 * pd + 1] = 255
                imageData.data[4 * pd + 2] = 255
                imageData.data[4 * pd + 3] = 255 * z[w * y + x]*WHITE_ALPHA
            }
        }
        for (let j = 0; j < DELTA_WHITE; j += 1) {
            white.push(imageData)
        }
    }
    const output = []
    for (let i =0; i < num * DELTA_WHITE; i += 1) {
        output.push([blue[i], white[i], wall[i]])
    }
    postMessage({type: "output", value: output})
}
