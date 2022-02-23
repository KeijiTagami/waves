class Camera {

    constructor() {
        this.azimuth = INITIAL_AZIMUTH;
        this.elevation = INITIAL_ELEVATION;
        this.position = null;
        this.viewMatrix = null;
    }

    changeAzimuth(deltaAzimuth) {
        this.azimuth = clamp(this.azimuth + deltaAzimuth, MIN_AZIMUTH, MAX_AZIMUTH);
        this.position = null;
        this.viewMatrix = null;
    }

    changeElevation(deltaElevation) {
        this.elevation = clamp(this.elevation + deltaElevation, MIN_ELEVATION, MAX_ELEVATION);
        this.position = null;
        this.viewMatrix = null;
    }

    getPosition() {
        if (this.position === null) {
            this.position = new Float32Array(3);
            this.position[0] = CAMERA_DISTANCE * Math.sin(Math.PI / 2 - this.elevation) * Math.sin(-this.azimuth) + ORBIT_POINT[0];
            this.position[1] = CAMERA_DISTANCE * Math.cos(Math.PI / 2 - this.elevation) + ORBIT_POINT[1];
            this.position[2] = CAMERA_DISTANCE * Math.sin(Math.PI / 2 - this.elevation) * Math.cos(-this.azimuth) + ORBIT_POINT[2];
        }
        return this.position;
    }

    getViewMatrix() {
        if (this.viewMatrix === null) {
            let orbitTranslationMatrix = makeIdentityMatrix();
            orbitTranslationMatrix[12] = -ORBIT_POINT[0];
            orbitTranslationMatrix[13] = -ORBIT_POINT[1];
            orbitTranslationMatrix[14] = -ORBIT_POINT[2];

            let yRotationMatrix = makeYRotationMatrix(this.azimuth);

            let xRotationMatrix = makeXRotationMatrix(this.elevation);

            let distanceTranslationMatrix = makeIdentityMatrix();
            distanceTranslationMatrix[14] = -CAMERA_DISTANCE;

            this.viewMatrix = makeIdentityMatrix();
            premultiplyMatrix(this.viewMatrix, this.viewMatrix, orbitTranslationMatrix);
            premultiplyMatrix(this.viewMatrix, this.viewMatrix, yRotationMatrix);
            premultiplyMatrix(this.viewMatrix, this.viewMatrix, xRotationMatrix);
            premultiplyMatrix(this.viewMatrix, this.viewMatrix, distanceTranslationMatrix);
        }
        return this.viewMatrix;
    }

}
