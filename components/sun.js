import * as THREE from 'three';

export class Sun {
    constructor(scene) {
        const sunGeometry = new THREE.SphereGeometry(10, 20, 20);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xF5E827 });
        this.sunLight = new THREE.DirectionalLight(0xF5E827, 1.2);
        this.sunLight.castShadow = false;
        this.tempVector = new THREE.Vector3();

        this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sunColors = {
            night: new THREE.Color(0x0b1020),
            dawn: new THREE.Color(0xffae00),
            midday: new THREE.Color(0xfff34a),
            noon: new THREE.Color(0xff6600)
        };

        const glowTexture = this.createGlowTexture();
        const glowMaterial = new THREE.SpriteMaterial({
            map: glowTexture,
            color: 0xffc76b,
            transparent: true,
            opacity: 0.08,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: false,
            toneMapped: false
        });

        this.sunGlow = new THREE.Sprite(glowMaterial);
        this.sunGlow.scale.set(52, 52, 1);
        
        this.sunMesh.position.set(0, 120, 0); // Position the sun in the sky
        this.sunLight.position.set(this.sunMesh.position.x, this.sunMesh.position.y, this.sunMesh.position.z); // Position the light at the same location as the sun mesh
        scene.add(this.sunMesh);
        scene.add(this.sunGlow);
        scene.add(this.sunLight);
    }

    createGlowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;

        const context = canvas.getContext('2d');
        const center = canvas.width / 2;
        const gradient = context.createRadialGradient(center, center, 0, center, center, center);

        gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
        gradient.addColorStop(0.16, 'rgba(255, 248, 190, 0.8)');
        gradient.addColorStop(0.35, 'rgba(255, 215, 110, 0.32)');
        gradient.addColorStop(1.0, 'rgba(255, 215, 110, 0.0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    update(timeOfDay = 0) {
        const normalizedTime = ((timeOfDay % 1) + 1) % 1;
        const angle = normalizedTime * Math.PI * 2;
        const horizontalRadius = 200;
        const verticalRadius = 100;
        const horizonOffset = 45;

        const sunHeight = Math.max(-100, Math.sin(angle) * verticalRadius + horizonOffset);
        const sunX = Math.cos(angle) * horizontalRadius;

        this.sunMesh.position.set(sunX, sunHeight, 0);

        const daylightFactor = Math.max(0, Math.sin(angle));
        const sunColor = this.getSunColor(normalizedTime);

        this.sunMesh.material.color.copy(sunColor);
        this.sunLight.color.copy(this.sunMesh.material.color);
        this.sunLight.intensity = 0.2 + daylightFactor * 1.2;
        this.sunLight.position.copy(this.sunMesh.position);

        this.sunGlow.position.copy(this.sunMesh.position);
        this.sunGlow.scale.setScalar(50 + daylightFactor * 16);
        this.sunGlow.material.opacity = 0.06 + daylightFactor * 0.18;

        return daylightFactor;
    }

    getSunColor(normalizedTime) {
        const colors = this.sunColors;
        const visibleDayEnd = 0.5;
        const dawnEnd = 0.125;
        const middayEnd = 0.25;
        const noonEnd = 0.375;

        if (normalizedTime < dawnEnd) {
            const t = normalizedTime / dawnEnd;
            return colors.night.clone().lerp(colors.dawn, t);
        }

        if (normalizedTime < middayEnd) {
            const t = (normalizedTime - dawnEnd) / (middayEnd - dawnEnd);
            return colors.dawn.clone().lerp(colors.midday, t);
        }

        if (normalizedTime < noonEnd) {
            const t = (normalizedTime - middayEnd) / (noonEnd - middayEnd);
            return colors.midday.clone().lerp(colors.noon, t);
        }

        if (normalizedTime < visibleDayEnd) {
            const t = (normalizedTime - noonEnd) / (visibleDayEnd - noonEnd);
            return colors.noon.clone().lerp(colors.night, t);
        }

        const t = Math.min(1, (normalizedTime - visibleDayEnd) / (1 - visibleDayEnd));
        return colors.noon.clone().lerp(colors.night, t);
    }
}   