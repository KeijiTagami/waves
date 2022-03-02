class Camera {

    constructor() {
        this.scale = INITIAL_SIZE;
        this.azimuth = INITIAL_AZIMUTH;
        this.elevation = INITIAL_ELEVATION;
        this.position = null;
        this.view = null;
    }

    changeScale(scale) {
        this.scale = scale;
        this.position = null;
        this.view = null;
    }

    changeAzimuth(deltaAzimuth) {
        this.azimuth = clamp(this.azimuth + deltaAzimuth, MIN_AZIMUTH, MAX_AZIMUTH);
        this.position = null;
        this.view = null;
    }

    changeElevation(deltaElevation) {
        this.elevation = clamp(this.elevation + deltaElevation, MIN_ELEVATION, MAX_ELEVATION);
        this.position = null;
        this.view = null;
    }

    getPosition() {
        if (this.position === null) {
            const camera = m4.inverse(this.getViewMatrix());
            this.position = [camera[12], camera[13], camera[14]];
        }
        return this.position;
    }

    getViewMatrix() {
        if (this.view === null) {
            this.view = m4.identity();
            m4.translate(this.view,
                -this.scale * CAMERA_POSITION[0],
                -this.scale * CAMERA_POSITION[1],
                -this.scale * CAMERA_POSITION[2], this.view);
            m4.yRotate(this.view, this.azimuth, this.view);
            m4.xRotate(this.view, this.elevation - 0.5 * Math.PI, this.view);
        }
        return this.view;
    }

}
