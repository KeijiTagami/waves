importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.1.0/dist/tf.min.js")
importScripts("./parameters.js")

//console.log("worker")
tf.loadLayersModel('./lightModel3/model.json').then((model) => {
    //console.log("load")
    addEventListener("message", m => {
        //console.log("message")
        const pixels = m.data
        const n = pixels.length
        //console.log("pixels", pixels)
        var input = tf.tensor2d(pixels)
        //console.log("input", input)
        input = input.reshape([n, OUTPUT_HEIGHT + 2 * WHITE_MARGIN, OUTPUT_WIDTH + 2 * WHITE_MARGIN, 4])
        //console.log("reshape", input)
        input = input.gather([0, 1, 2], 3)
        //console.log("gather", input)
        var data = model.predict(input)
        //console.log("predict", data)
        data = data.reshape([n, OUTPUT_HEIGHT, OUTPUT_WIDTH])
        //console.log("reshape", data)
        data.data().then((output) => {
            postMessage([n, output])
            //console.log("done", output)
        })
    })
    postMessage("initialized")
})

