"use strict";

function main() {
    const simulatorCanvas = document.getElementById('simulator');
    const camera = new Camera();
    const simulator = new Simulator(simulatorCanvas);

    function updateSize(e, o) {
        simulator.setSize(o.value);
    }
    function updateWindSpeed(e, o) {
        wind_speed = o.value;
        const dir = Math.PI * wind_direction / 180;
        simulator.setWind([wind_speed * Math.cos(dir), wind_speed * Math.sin(dir)]);
    }
    function updateWindDirection(e, o) {
        wind_direction = o.value;
        const dir = Math.PI * wind_direction / 180;
        simulator.setWind([wind_speed * Math.cos(dir), wind_speed * Math.sin(dir)]);
    }
    function updateChoppiness(e, o) {
        simulator.setChoppiness(o.value);
    }
    let wind_speed = INITIAL_WIND_SPEED;
    let wind_direction = 180.0;
    setupSlider("#size", {value: INITIAL_SIZE, slide: updateSize, min: MIN_SIZE, max: MAX_SIZE, step: 1, precision: 0});
    setupSlider("#wind-speed", {value: INITIAL_WIND_SPEED, slide: updateWindSpeed, min: MIN_WIND_SPEED, max: MAX_WIND_SPEED, step: 0.1, precision: 1});
    setupSlider("#wind-direction", {value: 0.0, slide: updateWindDirection, min: -180.0, max: 180.0, step: 1, precision: 0});
    setupSlider("#choppiness", {value: INITIAL_CHOPPINESS, slide: updateChoppiness, min: MIN_CHOPPINESS, max: MAX_CHOPPINESS, step: 0.1, precision: 1});

    function onResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        projectionMatrix = m4.perspective(FOV, width / height, NEAR, FAR);
        simulator.resize(width, height);
    }
    let width;
    let height;
    let projectionMatrix;
    onResize();
    window.addEventListener('resize', onResize);

    function onMouseDown(event) {
        event.preventDefault();
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        orbiting = true;
    }
    function onMouseMove(event) {
        event.preventDefault();
        if (orbiting) {
            simulatorCanvas.style.cursor = '-webkit-grabbing';
            simulatorCanvas.style.cursor = '-moz-grabbing';
            simulatorCanvas.style.cursor = 'grabbing';
            camera.changeAzimuth((event.clientX - lastMouseX) / width * SENSITIVITY);
            camera.changeElevation((event.clientY - lastMouseY) / height * SENSITIVITY);
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
        } else {
            simulatorCanvas.style.cursor = '-webkit-grab';
            simulatorCanvas.style.cursor = '-moz-grab';
            simulatorCanvas.style.cursor = 'grab';
        }
    }
    function onMouseUp(event) {
        event.preventDefault();
        orbiting = false;
    }
    let lastMouseX;
    let lastMouseY;
    let orbiting = false;
    simulatorCanvas.addEventListener('mousedown', onMouseDown, false);
    simulatorCanvas.addEventListener('mousemove', onMouseMove);
    simulatorCanvas.addEventListener('mouseup', onMouseUp);

    function render(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000 || 0.0;
        lastTime = currentTime;
        simulator.update(deltaTime);
        simulator.render(projectionMatrix, camera.getViewMatrix(), camera.getPosition());
        requestAnimationFrame(render);
    }
    let lastTime;
    requestAnimationFrame(render);
}

window.onload = () => {
    Simulator.load_gl().then(() => main());
}
