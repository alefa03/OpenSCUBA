import * as THREE from 'three';

export class DepthGauge {
    constructor(scubaDiver, water, options = {}) {
        this.scubaDiver = scubaDiver;
        this.water = water;

        this.width = options.width || 34;    
        this.height = options.height || 130; 
        this.margin = options.margin || 16;  
        this.maxDepth = options.maxDepth || 60; 

        // Tolerance settings
        this.surfaceOffset = options.surfaceOffset ?? 1.8;         // Offsets diver origin at surface
        this.maxDepthTolerance = options.maxDepthTolerance ?? 2.6; // Threshold buffer to reach max depth

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
        this.container.style.bottom = `${this.margin}px`;
        this.container.style.width = `${this.width}px`; // Lock width to prevent layout shift on count change
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '9';
        this.container.style.pointerEvents = 'none';
        this.container.style.userSelect = 'none';

        this.canvas = document.createElement('canvas');
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.display = 'block';
        this.container.appendChild(this.canvas);

        this.depthLabel = document.createElement('div');
        this.depthLabel.style.marginTop = '6px';
        this.depthLabel.style.textAlign = 'center';
        this.depthLabel.style.color = 'rgba(255, 255, 255, 0.85)';
        this.depthLabel.style.fontFamily = 'monospace';
        this.depthLabel.style.fontSize = '13px';
        this.depthLabel.style.fontWeight = 'bold';
        this.depthLabel.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.8)';
        this.depthLabel.style.whiteSpace = 'nowrap';
        this.depthLabel.innerText = '0.0m';
        this.container.appendChild(this.depthLabel);

        document.body.appendChild(this.container);

        this.ctx = this.canvas.getContext('2d');
    }

    _resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    update() {
        const diverY = this.scubaDiver.getCollisionPosition().y;
        
        const rawDepth = (this.water.waterLevel - diverY) - this.surfaceOffset;  // Collision offset is subtracted so that surface level starts at 0.0m

        const usableRange = Math.max(0.1, this.maxDepth - this.maxDepthTolerance); // Depth is remapped taking the tolerance in consideration
        const normalized = THREE.MathUtils.clamp(rawDepth / usableRange, 0, 1);
        
        const depth = normalized * this.maxDepth;

        this._draw(depth);
    }

    _draw(depth) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const radius = w / 2;
        const inset = 2;

        ctx.clearRect(0, 0, w, h);

        roundedRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius - inset);
        ctx.fillStyle = 'rgba(3, 16, 30, 0.55)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(11, 215, 230, 0.8)';
        ctx.stroke();

        const fraction = THREE.MathUtils.clamp(depth / this.maxDepth, 0, 1);
        const fillHeight = (h - inset * 2) * fraction;

        if (fillHeight > 0.5) {
            ctx.save();
            roundedRectPath(ctx, inset, inset, w - inset * 2, h - inset * 2, radius - inset);
            ctx.clip();

            const gradient = ctx.createLinearGradient(0, inset, 0, h - inset);
            gradient.addColorStop(0, 'rgba(61, 226, 255, 0.85)');
            gradient.addColorStop(1, 'rgba(11, 100, 215, 0.85)');
            ctx.fillStyle = gradient;
            ctx.fillRect(inset, inset, w - inset * 2, fillHeight);
            ctx.restore();
        }

        const markerY = inset + fillHeight;
        ctx.beginPath();
        ctx.moveTo(inset, markerY);
        ctx.lineTo(w - inset, markerY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        this.depthLabel.innerText = `${depth.toFixed(1)}m`;
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);

        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}