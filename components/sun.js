import * as THREE from 'three';

export class Sun {
    constructor(scene) {
        const sunGeometry = new THREE.SphereGeometry(10, 20, 20);
        const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xF5E827 });
        this.sunLight = new THREE.DirectionalLight(0xF5E827, 1.2);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.set(2048, 2048);
        this.sunLight.shadow.camera.near = 1;
        this.sunLight.shadow.camera.far = 350;
        this.sunLight.shadow.camera.left = -180;
        this.sunLight.shadow.camera.right = 180;
        this.sunLight.shadow.camera.top = 180;
        this.sunLight.shadow.camera.bottom = -180;
        this.sunLight.shadow.bias = -0.0005;
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

        const dayDuration = 0.625; // Makes daytime last 15 hours (15/24 = 0.625) from 06:00 to 21:00.
        let mappedTime;
        
        if (normalizedTime < dayDuration) {
            mappedTime = (normalizedTime / dayDuration) * 0.5; // Maps hours 06-21 into the daylight half of the sun's arc
        } else {
            mappedTime = 0.5 + ((normalizedTime - dayDuration) / (1.0 - dayDuration)) * 0.5; // Maps hours 21-06 into the night half of the sun's arc
        }

        const angle = mappedTime * Math.PI * 2;
        const horizontalRadius = 230;
        const verticalRadius = 100;
        const horizonOffset = 45;

        const sunHeight = Math.max(-100, Math.sin(angle) * verticalRadius + horizonOffset);
        const sunX = Math.cos(angle) * horizontalRadius;

        this.sunMesh.position.set(sunX, sunHeight, 0);

        const daylightFactor = Math.max(0, Math.sin(angle));
        const sunColor = this.getSunColor(mappedTime);

        this.sunMesh.material.color.copy(sunColor);
        this.sunLight.color.copy(this.sunMesh.material.color);
        this.sunLight.intensity = 0.2 + daylightFactor * 1.2;
        this.sunLight.position.copy(this.sunMesh.position);

        this.sunGlow.position.copy(this.sunMesh.position);
        this.sunGlow.scale.setScalar(50 + daylightFactor * 16);
        this.sunGlow.material.opacity = 0.06 + daylightFactor * 0.18;

        return daylightFactor;
    }

    getSunColor(mappedTime) {
        const colors = this.sunColors;
        
        const dawnEnd = 0.05;       // ~07:30
        const middayEnd = 0.35;     // ~16:30
        const noonEnd = 0.45;       // ~19:30
        const visibleDayEnd = 0.5;  //  21:00

        if (mappedTime < dawnEnd) {
            const t = mappedTime / dawnEnd;
            return colors.night.clone().lerp(colors.dawn, t);
        }

        if (mappedTime < middayEnd) {
            const t = (mappedTime - dawnEnd) / (middayEnd - dawnEnd);
            return colors.dawn.clone().lerp(colors.midday, t);
        }

        if (mappedTime < noonEnd) {
            const t = (mappedTime - middayEnd) / (noonEnd - middayEnd);
            return colors.midday.clone().lerp(colors.noon, t);
        }

        if (mappedTime < visibleDayEnd) {
            const t = (mappedTime - noonEnd) / (visibleDayEnd - noonEnd);
            return colors.noon.clone().lerp(colors.night, t);
        }

        return colors.night.clone();
    }
}   