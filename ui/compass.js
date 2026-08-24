import * as THREE from 'three';

export class Compass {
    constructor(camera, options = {}) {
        this.camera = camera;

        this.size = options.size || 110;    // Diameter of the dial, in CSS pixels
        this.margin = options.margin || 16; // Distance from the screen edges

        this._buildDom();
        this._resize();

        this._onResize = () => this._resize();
        window.addEventListener('resize', this._onResize);

        this.update();
    }

    _buildDom() {
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.left = `${this.margin}px`;
        this.container.style.top = `${this.margin}px`;
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '9';
        this.container.style.pointerEvents = 'none';
        this.container.style.userSelect = 'none';

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = `${this.size}px`;
        this.canvas.style.height = `${this.size}px`;
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.headingLabel = document.createElement('div');
        this.headingLabel.style.position = 'relative';
        this.headingLabel.style.marginTop = '4px';
        this.headingLabel.style.color = 'rgba(255, 255, 255, 0.85)';
        this.headingLabel.style.fontFamily = 'monospace';
        this.headingLabel.style.fontSize = '13px';
        this.headingLabel.style.fontWeight = 'bold';
        this.headingLabel.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.8)';
        this.headingLabel.style.whiteSpace = 'nowrap';

        this.headingValue = document.createElement('span');
        this.headingValue.innerText = '000';
        this.headingLabel.appendChild(this.headingValue);

        this.headingDegreeMark = document.createElement('span');
        this.headingDegreeMark.style.position = 'absolute';
        this.headingDegreeMark.style.top = '-1px';
        this.headingDegreeMark.style.right = '-9px';
        this.headingDegreeMark.style.fontSize = '0.65em';
        this.headingDegreeMark.innerText = '\u00B0';
        this.headingLabel.appendChild(this.headingDegreeMark);

        this.container.appendChild(this.headingLabel);

        document.body.appendChild(this.container);

        this.ctx = this.canvas.getContext('2d');
    }

    _resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.size * dpr;
        this.canvas.height = this.size * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    update() {
        const yawDeg = THREE.MathUtils.radToDeg(this.camera.rotation.y);
        const bearingDeg = THREE.MathUtils.euclideanModulo(-yawDeg, 360);

        this._draw(bearingDeg);
    }

    _draw(bearingDeg) {
        const ctx = this.ctx;
        const size = this.size;
        const cx = size / 2;
        const cy = size / 2;
        const radius = size / 2 - 4;

        ctx.clearRect(0, 0, size, size);

        // Dial background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(3, 16, 30, 0.55)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(11, 215, 230, 0.8)';
        ctx.stroke();

        // Tick marks every 30 degrees, longer/brighter on the cardinal points
        for (let tick = 0; tick < 360; tick += 30) {
            const isCardinal = tick % 90 === 0;
            const angle = THREE.MathUtils.degToRad(tick - bearingDeg);
            const innerR = isCardinal ? radius - 12 : radius - 7;

            const x1 = cx + Math.sin(angle) * radius;
            const y1 = cy - Math.cos(angle) * radius;
            const x2 = cx + Math.sin(angle) * innerR;
            const y2 = cy - Math.cos(angle) * innerR;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = isCardinal ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = isCardinal ? 2 : 1;
            ctx.stroke();
        }

        // Cardinal letters, kept upright (not rotated) as they orbit the dial
        const labels = [
            { text: 'N', bearing: 0, color: '#ff5c5c' },
            { text: 'E', bearing: 90, color: 'rgba(255, 255, 255, 0.9)' },
            { text: 'S', bearing: 180, color: 'rgba(255, 255, 255, 0.9)' },
            { text: 'W', bearing: 270, color: 'rgba(255, 255, 255, 0.9)' },
        ];

        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelR = radius - 18;
        for (const label of labels) {
            const angle = THREE.MathUtils.degToRad(label.bearing - bearingDeg);
            const x = cx + Math.sin(angle) * labelR;
            const y = cy - Math.cos(angle) * labelR;

            ctx.fillStyle = label.color;
            ctx.fillText(label.text, x, y);
        }

        // Fixed marker at the top of the dial: it shows the direction currently faced.
        ctx.beginPath();
        ctx.moveTo(cx, 3);
        ctx.lineTo(cx - 5, 13);
        ctx.lineTo(cx + 5, 13);
        ctx.closePath();
        ctx.fillStyle = '#0bd7e6';
        ctx.fill();

        this.headingValue.innerText = Math.round(bearingDeg).toString().padStart(3, '0');
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}