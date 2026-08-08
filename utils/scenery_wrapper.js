import * as THREE from 'three';
import { Scenery } from '../components/scenery.js';

export class SceneryWrapper { // Utility class to easily handle multiple Scenery instances at once
    #group;

    constructor(scene, sceneryConfigs = [], position = new THREE.Vector3(0, 0, 0), rotation = new THREE.Vector3(0, 0, 0), scale = 1.0) {
        if (!scene) throw new Error("No scene specified!");

        this.#group = new THREE.Group();
        this.#group.position.copy(position);
        this.#group.rotation.set(rotation.x, rotation.y, rotation.z);
        this.#group.scale.setScalar(scale);
        scene.add(this.#group);

        for (const config of sceneryConfigs) {
            new Scenery(
                this.#group,
                config.path,
                config.scale,
                config.position,
                config.rotation,
                config.canCollide,
                config.texturePath,
                config.textureRepeat
            );
        }
    }

    set_position(new_position) {
        this.#group.position.copy(new_position);
    }
    set_rotation(new_rotation) {
        this.#group.rotation.set(new_rotation.x, new_rotation.y, new_rotation.z);
    }
    set_scale(new_scale) {
        this.#group.scale.setScalar(new_scale);
    }

    get position() { return this.#group.position; }
    get rotation() { return this.#group.rotation; }
    get scale() { return this.#group.scale; }
}