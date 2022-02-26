//waves in simulation are not actually Gerstner waves but Gerstner waves are used for visualisation purposes
class Profile {

    constructor(canvas) {
        this.context = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.context.strokeStyle = PROFILE_COLOR;
        this.context.lineWidth = PROFILE_LINE_WIDTH;
        this.render(INITIAL_CHOPPINESS);
    }

    render(choppiness) {
        this.context.clearRect(0, 0, this.width, this.height);
        this.context.beginPath();
        this.context.moveTo(this.evaluateX(0, choppiness), this.evaluateY(0));
        for (let x = 0; x <= this.width; x += PROFILE_STEP) {
            this.context.lineTo(this.evaluateX(x, choppiness), this.evaluateY(x));
        }
        this.context.stroke();
    }

    evaluateX(x, choppiness) {
        return x - choppiness * CHOPPINESS_SCALE * PROFILE_AMPLITUDE * Math.sin(x * PROFILE_OMEGA + PROFILE_PHI);
    }

    evaluateY(x) {
        return PROFILE_AMPLITUDE * Math.cos(x * PROFILE_OMEGA + PROFILE_PHI) + PROFILE_OFFSET;
    }

}

class Arrow {

    constructor(parent, valueX, valueY) {
        const arrow = [valueX * WIND_SCALE, 0.0, valueY * WIND_SCALE];
        const tip = addToVector([], ARROW_ORIGIN, arrow);

        const shaftDiv = document.createElement('div');
        shaftDiv.style.position = 'absolute';
        shaftDiv.style.width = ARROW_SHAFT_WIDTH + 'px';
        shaftDiv.style.background = UI_COLOR;
        setTransformOrigin(shaftDiv, 'center top');
        setTransform(shaftDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_SHAFT_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg)');
        parent.appendChild(shaftDiv);

        const headDiv = document.createElement('div');
        headDiv.style.position = 'absolute';
        headDiv.style.borderStyle = 'solid';
        headDiv.style.borderColor = UI_COLOR + ' transparent transparent transparent';
        headDiv.style.borderWidth = ARROW_HEAD_HEIGHT + 'px ' + ARROW_HEAD_WIDTH / 2 + 'px 0px ' + ARROW_HEAD_WIDTH / 2 + 'px';
        setTransformOrigin(headDiv, 'center top');
        setTransform(headDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_HEAD_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg)');
        parent.appendChild(headDiv);

        this.valueX = valueX;
        this.valueY = valueY;
        this.arrow = arrow;
        this.tip = tip;
        this.shaftDiv = shaftDiv;
        this.headDiv = headDiv;
        this.render();
    }

    render() {
        const angle = Math.atan2(this.arrow[2], this.arrow[0]);
        const arrowLength = lengthOfVector(this.arrow);

        this.shaftDiv.style.height = (arrowLength - ARROW_HEAD_HEIGHT + 1 + ARROW_OFFSET) + 'px';
        setTransform(this.shaftDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_SHAFT_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg) rotateZ(' + (angle - Math.PI / 2) + 'rad) translateY(' + -ARROW_OFFSET + 'px)');
        setTransform(this.headDiv, 'translate3d(' + (ARROW_ORIGIN[0] - ARROW_HEAD_WIDTH / 2) + 'px, ' + ARROW_ORIGIN[1] + 'px, ' + ARROW_ORIGIN[2] + 'px) rotateX(90deg) rotateZ(' + (angle - Math.PI / 2) + 'rad) translateY(' + (arrowLength - ARROW_HEAD_HEIGHT - 1) + 'px)');
    }

    update(mouseX, mouseZ) {
        const arrow = [mouseX, 0, mouseZ];
        const arrowLength = lengthOfVector(arrow);
        subtractFromVector(arrow, arrow, ARROW_ORIGIN);
        if (arrowLength > MAX_WIND_SPEED * WIND_SCALE) {
            multiplyVectorByScalar(arrow, arrow, (MAX_WIND_SPEED * WIND_SCALE) / arrowLength);
        } else if (lengthOfVector(arrow) < MIN_WIND_SPEED * WIND_SCALE) {
            multiplyVectorByScalar(arrow, arrow, (MIN_WIND_SPEED * WIND_SCALE) / arrowLength);
        }
        addToVector(this.tip, ARROW_ORIGIN, arrow);
        this.arrow = arrow;
        this.render();
        this.valueX = mouseX / WIND_SCALE;
        this.valueY = mouseZ / WIND_SCALE;
    }

    getValue() {
        return lengthOfVector(this.arrow) / WIND_SCALE;
    }

    getValueX() {
        return this.valueX;
    }

    getValueY() {
        return this.valueY;
    }

    distanceToTip(vector) {
        return distanceBetweenVectors(this.tip, vector);
    }

    getTipZ() {
        return this.tip[2];
    }

}

class Slider {

    constructor(parent, x, z, length, minValue, maxValue, value, sliderBreadth, handleSize) {
        const sliderLeftDiv = document.createElement('div');
        sliderLeftDiv.style.position = 'absolute';
        sliderLeftDiv.style.width = length + 'px';
        sliderLeftDiv.style.height = sliderBreadth + 'px';
        sliderLeftDiv.style.backgroundColor = SLIDER_LEFT_COLOR;
        setTransformOrigin(sliderLeftDiv, 'center top');
        setTransform(sliderLeftDiv, 'translate3d(' + x + 'px, 0, ' + z + 'px) rotateX(90deg)');
        parent.appendChild(sliderLeftDiv);

        const sliderRightDiv = document.createElement('div');
        sliderRightDiv.style.position = 'absolute';
        sliderRightDiv.style.width = length + 'px';
        sliderRightDiv.style.height = sliderBreadth + 'px';
        sliderRightDiv.style.backgroundColor = SLIDER_RIGHT_COLOR;
        setTransformOrigin(sliderRightDiv, 'center top');
        setTransform(sliderRightDiv, 'translate3d(' + x + 'px, 0, ' + z + 'px) rotateX(90deg)');
        parent.appendChild(sliderRightDiv);

        const handleDiv = document.createElement('div');
        handleDiv.style.position = 'absolute';
        handleDiv.style.width = handleSize + 'px';
        handleDiv.style.height = handleSize + 'px';
        handleDiv.style.borderRadius = handleSize * 0.5 + 'px';
        handleDiv.style.background = HANDLE_COLOR;
        setTransformOrigin(handleDiv, 'center top');
        setTransform(handleDiv, 'translate3d(' + x + 'px, 0px, ' + z + 'px) rotateX(90deg)');
        parent.appendChild(handleDiv);

        const handleX = (x + ((value - minValue) / (maxValue - minValue)) * length) - handleDiv.offsetWidth / 2;

        this.x = x;
        this.z = z;
        this.length = length;
        this.value = value;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.sliderLeftDiv = sliderLeftDiv; 
        this.sliderRightDiv = sliderRightDiv; 
        this.handleDiv = handleDiv;
        this.handleX = handleX;
        this.render();
    }

    render() {
        const fraction = (this.value - this.minValue) / (this.maxValue - this.minValue);

        setTransform(this.handleDiv, 'translate3d(' + (this.handleX - this.handleDiv.offsetWidth * 0.5) + 'px, 0, ' + (this.z - this.handleDiv.offsetHeight * 0.5) + 'px) rotateX(90deg)');
        this.sliderLeftDiv.style.width = fraction * this.length + 'px';
        this.sliderRightDiv.style.width = (1.0 - fraction) * this.length + 'px';
        setTransform(this.sliderRightDiv, 'translate3d(' + (this.x + fraction * this.length) + 'px, 0, ' + this.z + 'px) rotateX(90deg)');
    }

    update(mouseX, callback) {
        this.handleX = clamp(mouseX, this.x, this.x + this.length);
        const fraction = clamp((mouseX - this.x) / this.length, 0.0, 1.0);
        this.value = this.minValue + fraction * (this.maxValue - this.minValue);
        callback(this.value);
        this.render();
    }

    getValue() {
        return this.value;
    }

    distanceToHandle(vector) {
        return distanceBetweenVectors([this.handleX, 0, this.z], vector);
    }

}
