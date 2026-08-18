import * as THREE from 'three';

export class Beam extends THREE.Group {
    constructor({color = 0xffffff, intensity = 100, angle = Math.PI / 8, distance = 20, radius = 3, length = 10, opacity = 0.12, penumbra = 0.2} = {}) {
        super();

        this.length = length;
        this.radius = radius;

        // Actual light
        this.light = new THREE.SpotLight(
        color,
        intensity,
        distance,
        angle,
        penumbra
        );

        this.add(this.light);

        // SpotLight target
        this.target = new THREE.Object3D();
        this.target.position.set(0, -length, 0);

        this.add(this.target);
        this.light.target = this.target;

        // Visible beam
        const geometry = new THREE.ConeGeometry(
        radius,
        length,
        64,
        1,
        true
        );

        const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        });

        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.rotation.x = Math.PI;

        // Move cone so its tip starts at the light.
        this.mesh.position.y = -length / 2;

        this.add(this.mesh);
    }

    setColor(color) {
        this.light.color.set(color);
        this.mesh.material.color.set(color);
    }

    setIntensity(intensity) {
        this.light.intensity = intensity;
        this.light.visible = intensity > 0;
    }

    setOpacity(opacity) {
        this.mesh.material.opacity = opacity;
        this.mesh.visible = opacity > 0;
    }

    setDirection(direction) {
        const dir = direction.clone().normalize();

        this.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        dir
        );
    }

    setEndpoints(start, end) {
        const direction = new THREE.Vector3()
        .subVectors(end, start);

        const length = direction.length();

        this.position.copy(start);

        this.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        direction.normalize()
        );

        this.setLength(length);
    }

    setLength(length) {
        this.length = length;

        // Update cone geometry
        this.mesh.geometry.dispose();

        this.mesh.geometry = new THREE.ConeGeometry(
        this.radius,
        length,
        64,
        1,
        true
        );

        this.mesh.position.y = -length / 2;

        // Update light
        this.light.distance = length;
        this.target.position.set(0, -length, 0);
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}