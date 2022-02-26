class Main {

    constructor() {
        this.simulatorCanvas = document.getElementById(SIMULATOR_CANVAS_ID);
        this.simulator = new Simulator(this.simulatorCanvas);
        this.profile = new Profile(document.getElementById(PROFILE_CANVAS_ID)),
        this.camera = new Camera();

        this.cameraDiv = document.getElementById(CAMERA_DIV_ID);
        this.windArrow = new Arrow(this.cameraDiv, INITIAL_WIND[0], INITIAL_WIND[1]);
        this.sizeSlider = new Slider(this.cameraDiv, SIZE_SLIDER_X, SIZE_SLIDER_Z,
                SIZE_SLIDER_LENGTH, MIN_SIZE, MAX_SIZE, INITIAL_SIZE, SIZE_SLIDER_BREADTH, SIZE_HANDLE_SIZE);
        this.choppinessSlider = new Slider(this.cameraDiv, CHOPPINESS_SLIDER_X, CHOPPINESS_SLIDER_Z,
                CHOPPINESS_SLIDER_LENGTH, MIN_CHOPPINESS, MAX_CHOPPINESS, INITIAL_CHOPPINESS, CHOPPINESS_SLIDER_BREADTH, CHOPPINESS_HANDLE_SIZE);

        this.windSpeedSpan = document.getElementById(WIND_SPEED_SPAN_ID),
        setText(this.windSpeedSpan, this.windArrow.getValue(), WIND_SPEED_DECIMAL_PLACES);
        this.windDiv = document.getElementById(WIND_SPEED_DIV_ID),
        setTransform(this.windDiv, 'translate3d(' + WIND_SPEED_X + 'px, 0px, ' + Math.max(MIN_WIND_SPEED_Z, this.windArrow.getTipZ() + WIND_SPEED_OFFSET) + 'px) rotateX(90deg)');

        this.sizeSpan = document.getElementById('size-value');
        setText(this.sizeSpan, INITIAL_SIZE, SIZE_DECIMAL_PLACES);

        this.choppinessDiv = document.getElementById(CHOPPINESS_DIV_ID);
        setText(this.choppinessDiv, INITIAL_CHOPPINESS, CHOPPINESS_DECIMAL_PLACES);

        this.uiDiv = document.getElementById(UI_DIV_ID);

        this.overlayDiv = document.getElementById(OVERLAY_DIV_ID);
        this.overlayDiv.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.overlayDiv.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.overlayDiv.addEventListener('mouseup', this.onMouseUp.bind(this));

        window.addEventListener('mouseout', this.onMouseOut.bind(this));
        window.addEventListener('resize', this.onresize.bind(this));

        this.mode = NONE;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.projectionMatrix = makePerspectiveMatrix(new Float32Array(16), FOV, MIN_ASPECT, NEAR, FAR);
        this.onresize();
        this.render();
    }

    setUIPerspective(height) {
        const fovValue = 0.5 / Math.tan(FOV / 2) * height;
        setPerspective(this.uiDiv, fovValue + 'px');
    }

    unproject(viewMatrix, x, y, width, height) {
        let inverseProjectionViewMatrix = [];
        let nearPoint = [];
        let farPoint = [];
        premultiplyMatrix(inverseProjectionViewMatrix, viewMatrix, this.projectionMatrix);
        invertMatrix(inverseProjectionViewMatrix, inverseProjectionViewMatrix);

        setVector4(nearPoint, (x / width) * 2.0 - 1.0, ((height - y) / height) * 2.0 - 1.0, 1.0, 1.0);
        transformVectorByMatrix(nearPoint, nearPoint, inverseProjectionViewMatrix);

        setVector4(farPoint, (x / width) * 2.0 - 1.0, ((height - y) / height) * 2.0 - 1.0, -1.0, 1.0);
        transformVectorByMatrix(farPoint, farPoint, inverseProjectionViewMatrix);

        projectVector4(nearPoint, nearPoint);
        projectVector4(farPoint, farPoint);

        const t = -nearPoint[1] / (farPoint[1] - nearPoint[1]);
        return [
            nearPoint[0] + t * (farPoint[0] - nearPoint[0]),
            nearPoint[1] + t * (farPoint[1] - nearPoint[1]),
            nearPoint[2] + t * (farPoint[2] - nearPoint[2]),
        ];
    }

    onMouseDown(event) {
        event.preventDefault();

        var mousePosition = getMousePosition(event, this.uiDiv);
        var mouseX = mousePosition.x,
            mouseY = mousePosition.y;

        var point = this.unproject(this.camera.getViewMatrix(), mouseX, mouseY, this.width, this.height);

        if (this.windArrow.distanceToTip(point) < ARROW_TIP_RADIUS) {
            this.mode = ROTATING;
        } else if (this.sizeSlider.distanceToHandle(point) < SIZE_HANDLE_RADIUS) {
            this.mode = SLIDING_SIZE;
        } else if (this.choppinessSlider.distanceToHandle(point) < CHOPPINESS_HANDLE_RADIUS) {
            this.mode = SLIDING_CHOPPINESS;
        } else {
            this.mode = ORBITING;
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }

    onMouseMove(event) {
        event.preventDefault();

        const mousePosition = getMousePosition(event, this.uiDiv),
            mouseX = mousePosition.x,
            mouseY = mousePosition.y;

        const point = this.unproject(this.camera.getViewMatrix(), mouseX, mouseY, this.width, this.height);

        if (this.windArrow.distanceToTip(point) < ARROW_TIP_RADIUS || this.mode === ROTATING) {
            this.overlayDiv.style.cursor = 'move';
        } else if (this.sizeSlider.distanceToHandle(point) < SIZE_HANDLE_RADIUS || 
            this.choppinessSlider.distanceToHandle(point) < CHOPPINESS_HANDLE_RADIUS || 
            this.mode === SLIDING_SIZE || this.mode === SLIDING_CHOPPINESS) {
            this.overlayDiv.style.cursor = 'ew-resize';
        } else if (this.mode === ORBITING) {
            this.overlayDiv.style.cursor = '-webkit-grabbing';
            this.overlayDiv.style.cursor = '-moz-grabbing';
            this.overlayDiv.style.cursor = 'grabbing';
        } else {
            this.overlayDiv.style.cursor = '-webkit-grab';
            this.overlayDiv.style.cursor = '-moz-grab';
            this.overlayDiv.style.cursor = 'grab';
        }

        if (this.mode === ORBITING) {
            this.camera.changeAzimuth((mouseX - this.lastMouseX) / this.width * SENSITIVITY);
            this.camera.changeElevation((mouseY - this.lastMouseY) / this.height * SENSITIVITY);
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        } else if (this.mode === ROTATING) {
            this.windArrow.update(point[0], point[2]);
            this.simulator.setWind([this.windArrow.getValueX(), this.windArrow.getValueY()]);
            setText(this.windSpeedSpan, this.windArrow.getValue(), WIND_SPEED_DECIMAL_PLACES);

            setTransform(this.windDiv, 'translate3d(' + WIND_SPEED_X + 'px, 0px, ' + Math.max(MIN_WIND_SPEED_Z, this.windArrow.getTipZ() + WIND_SPEED_OFFSET) + 'px) rotateX(90deg)');
        } else if (this.mode === SLIDING_SIZE) {
            this.sizeSlider.update(point[0], (size) => {
                this.simulator.setSize(size);
                setText(this.sizeSpan, size, SIZE_DECIMAL_PLACES);
            });
        } else if (this.mode === SLIDING_CHOPPINESS) {
            this.choppinessSlider.update(point[0], (choppiness) => {
                this.simulator.setChoppiness(choppiness);
                setText(this.choppinessDiv, choppiness, CHOPPINESS_DECIMAL_PLACES);
                this.profile.render(choppiness);
            });
        }
    }

    onMouseUp(event) {
        event.preventDefault();
        this.mode = NONE;
    }

    onMouseOut(event) {
        const from = event.relatedTarget || event.toElement;
        if (!from || from.nodeName === 'HTML') {
            this.mode = NONE;
        }
    }

    onresize() {
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;

        this.overlayDiv.style.width = windowWidth + 'px';
        this.overlayDiv.style.height = windowHeight + 'px';

        if (windowWidth / windowHeight > MIN_ASPECT) {
            makePerspectiveMatrix(this.projectionMatrix, FOV, windowWidth / windowHeight, NEAR, FAR);
            this.simulator.resize(windowWidth, windowHeight);
            this.uiDiv.style.width = windowWidth + 'px';
            this.uiDiv.style.height = windowHeight + 'px';
            this.cameraDiv.style.width = windowWidth + 'px';
            this.cameraDiv.style.height = windowHeight + 'px';
            this.simulatorCanvas.style.top = '0px';
            this.uiDiv.style.top = '0px';
            this.setUIPerspective(windowHeight);
            this.width = windowWidth;
            this.height = windowHeight;
        } else {
            const newHeight = windowWidth / MIN_ASPECT;
            makePerspectiveMatrix(this.projectionMatrix, FOV, windowWidth / newHeight, NEAR, FAR);
            this.simulator.resize(windowWidth, newHeight);
            this.simulatorCanvas.style.top = (windowHeight - newHeight) * 0.5 + 'px';
            this.uiDiv.style.top = (windowHeight - newHeight) * 0.5 + 'px';
            this.setUIPerspective(newHeight);
            this.uiDiv.style.width = windowWidth + 'px';
            this.uiDiv.style.height = newHeight + 'px';
            this.cameraDiv.style.width = windowWidth + 'px';
            this.cameraDiv.style.height = newHeight + 'px';
            this.width = windowWidth;
            this.height = newHeight;
        }
    }

    render(currentTime) {
        let deltaTime;
        if (currentTime) {
            deltaTime = (currentTime - this.lastTime) / 1000 || 0.0;
            this.lastTime = currentTime;
        } else {
            deltaTime = 0.0;
            this.lastTime = (new Date()).getTime();
        }

        const fovValue = 0.5 / Math.tan(FOV / 2) * this.height;
        setTransform(this.cameraDiv, 'translate3d(0px, 0px, ' + fovValue + 'px) ' + toCSSMatrix(this.camera.getViewMatrix()) + ' translate3d(' + this.width / 2 + 'px, ' + this.height / 2 + 'px, 0px)');
        this.simulator.update(deltaTime);
        this.simulator.render(this.projectionMatrix, this.camera.getViewMatrix(), this.camera.getPosition());

        requestAnimationFrame(this.render.bind(this));
    }

}

window.onload = () => {
    Simulator.load_gl().then(() => new Main());
}
