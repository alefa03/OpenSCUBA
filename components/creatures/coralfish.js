import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SmallMarineCreature } from "../marinecreature";

export class CoralFish extends SmallMarineCreature {
    static modelPath = `${import.meta.env.BASE_URL}assets/marine_creatures/coral_fish.glb`;

    constructor(scene, options = {}) {
        super(scene, options);
        this.init();
    }

    async init() {
        const { model: sourceModel } = await CoralFish._getSource();
        const model = clone(sourceModel);

        model.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) {
                obj.castShadow = true;
                obj.receiveShadow = false;
            }
        });

        model.position.copy(this.wanderTarget); // spawn near the first random target, not the origin
        model.scale.multiplyScalar(this.scale);
        this.scene.add(model);
        this.model = model;
        this.attachCollisionFlags();
    }

    update(deltaTime) {
        if (!this.model) return;

        const speed = this._updateWander(deltaTime);
        this.setSwimIntensity(speed);

        //this.model.position.set(0, 5, -5);
    }
}