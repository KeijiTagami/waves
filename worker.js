importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.1.0/dist/tf.min.js")
//importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-cpu@4.1.0/dist/tf-backend-cpu.min.js")
importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/dist/tf-backend-wasm.min.js")
importScripts("./parameters.js")

tf.wasm.setWasmPaths("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.1.0/wasm-out/")
tf.setBackend("wasm").then(() => {
//tf.setBackend("webgl").then(() => {
    console.log(tf.getBackend())
    //tf.wasm.setThreadsCount(2)
    console.log(tf.wasm.getThreadsCount())
    tf.loadLayersModel('./lightModel3/model.json').then((model) => {
        for (var i = 0; i < 10; i += 1) {
            const n = 2
            var start = Date.now()
            model.predict(tf.zeros([n, 1024, 1024, 3])).dataSync()
            console.log("test", n, Date.now() - start, "ms")
        }
        addEventListener("message", m => {
            console.log("message", m)
            const start = Date.now()
            const pixels = m.data
            const n = pixels.length
            var input = tf.tensor2d(pixels)
            input = input.reshape([n, OUTPUT_HEIGHT + 2 * WHITE_MARGIN, OUTPUT_WIDTH + 2 * WHITE_MARGIN, 4])
            input = input.gather([0, 1, 2], 3)
            var data = model.predict(input)
            var output = data.data()
            console.log("predict", n, Date.now() - start, "ms")
            postMessage([n, output])
        })
        postMessage("initialized")
    })
})
