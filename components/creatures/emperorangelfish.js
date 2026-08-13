import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ModelLoader } from '../../utils/model_loader.js';
import { SmallMarineCreature } from "../marinecreature.js";

export class EmperorAngelfish extends SmallMarineCreature {
    static modelPath = `${import.meta.env.BASE_URL}assets/marine_creatures/emperor_angelfish.glb`;

    static #fixMaterials(model) { // This utility function is used to fix the emperor angelfish's glitching issues. 
        model.traverse((obj) => {
            if (!obj.isMesh && !obj.isSkinnedMesh) return;
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const mat of materials) {
                mat.transparent = false;
                mat.alphaTest = 0.5;
                mat.depthWrite = true;
                mat.needsUpdate = true;
            }
        });
    }

    constructor(scene, options = {}) {
        super(scene, options);
        this.init();
    }

    async init() {
        const { model: sourceModel } = await EmperorAngelfish._getSource()
            .then((result) => {
                EmperorAngelfish.#fixMaterials(result.model);
                return result;
            });

        const model = clone(sourceModel);

        model.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) {
                obj.castShadow = true;
                obj.receiveShadow = false;
            }
        });

        model.position.copy(this.wanderTarget); // spawn near the first random target
        model.scale.multiplyScalar(this.scale);
        this.scene.add(model);
        this.model = model;
        this.attachCollisionFlags();

        this.bones = {
            spine: ['BackB_M_032', 'BackD_M_033', 'BackE_M_00', 'BackF_M_034']
                .map(n => model.getObjectByName(n)),
            tail: ['TailFinUpper_M_035', 'TailFinLower_M_041']
                .map(n => model.getObjectByName(n)),
        };

        this.restSpine = this.bones.spine.map(b => b ? b.rotation.y : 0);
        this.restTail = this.bones.tail.map(b => b ? b.rotation.y : 0);
    }

    update(deltaTime) {
        if (!this.model) return;

        const speed = this._updateWander(deltaTime);
        this.setSwimIntensity(speed);

        if (!this.bones || !this.restSpine) return;

        this.swimBlend += (this.targetSwimBlend - this.swimBlend) * Math.min(1, deltaTime * 2.5);
        this.elapsed += deltaTime;

        const freq = THREE.MathUtils.lerp(1.1, 2.6, this.swimBlend);
        const amp = THREE.MathUtils.lerp(0.05, 0.35, this.swimBlend);
        const t = this.elapsed * freq;

        this.bones.spine.forEach((bone, i) => {
            if (!bone) return;
            const strength = (i + 1) / this.bones.spine.length;
            bone.rotation.y = this.restSpine[i] + Math.sin(t - i * 0.9) * amp * strength;
        });

        const tailPhase = this.bones.spine.length * 0.9;
        const tailAmp = amp * 1.6;
        this.bones.tail.forEach((bone, i) => {
            if (!bone) return;
            bone.rotation.y = this.restTail[i] + Math.sin(t - tailPhase) * tailAmp;
        });
    }
}