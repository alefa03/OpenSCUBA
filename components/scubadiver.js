import { ModelLoader } from '../utils/model_loader.js';
import * as THREE from 'three';

export class ScubaDiver {
    constructor(scene) {
        this.scene = scene;
        this.model = null;
        this.bones = null;
        this.restRotation = null;
        this.elapsed = 0;

        this.init();
    }

    async init() {
        const modelLoader = new ModelLoader();
        const {model} = await modelLoader.loadModel('../assets/nanando_diver.glb');

        model.scale.multiplyScalar(0.5);
        model.position.set(0, 5, -5);
        model.rotation.set(-Math.PI/2, 0, 0); // face the camera

        this.scene.add(model);
        this.model = model;

        let skeleton = null;
        model.traverse((obj) => {
            if (!skeleton && obj.isSkinnedMesh) skeleton = obj.skeleton;
        });

        this.bones = {
            spine: model.getObjectByName('mixamorigSpine_53'),

            armL:  model.getObjectByName('mixamorigLeftArm_25'),      // upper arm (shoulder)
            armR:  model.getObjectByName('mixamorigRightArm_49'),
            armL2: model.getObjectByName('mixamorigLeftForeArm_24'),  // lower arm (elbow)
            armR2: model.getObjectByName('mixamorigRightForeArm_48'),

            legL:  model.getObjectByName('mixamorigLeftUpLeg_58'),    // upper leg (hip)
            legR:  model.getObjectByName('mixamorigRightUpLeg_63'),
            legL2: model.getObjectByName('mixamorigLeftLeg_57'),      // lower leg (knee)
            legR2: model.getObjectByName('mixamorigRightLeg_62'),

            finL:  model.getObjectByName('mixamorigLeftFoot_56'),     // upper fin
            finR:  model.getObjectByName('mixamorigRightFoot_61'),
            finL2:  model.getObjectByName('mixamorigLeftToeBase_55'),     // lower fin
            finR2:  model.getObjectByName('mixamorigRightToeBase_60')
        };

        for (const bone of skeleton.bones) { // Resets EVERY bone in the skeleton to its true bind pose (T-pose)
            const rest = getBindPoseEuler(bone, skeleton);
            bone.rotation.set(rest.x, rest.y, rest.z);
        }

        this.restRotation = {}; // Remembers the rest pose just for the joints that will be animated
        for (const [name, bone] of Object.entries(this.bones)) {
            if (!bone) {
                console.warn(`ScubaDiver: bone "${name}" not found in model`);
                continue;
            }
            this.restRotation[name] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
        }
    }

    update(deltaTime) {
        if (!this.bones || !this.restRotation) return;

        this.elapsed += deltaTime;
        const speed = 2.2;
        const rest = this.restRotation;

        const swing = Math.sin(this.elapsed * speed);
        const bend = Math.sin(this.elapsed * speed + Math.PI / 2);

        this.bones.spine.rotation.x = rest.spine.x + swing * 0.01;

        this.bones.armL.rotation.x  = rest.armL.x  + swing * 0.25;
        this.bones.armR.rotation.x  = rest.armR.x  + swing * 0.25;
        this.bones.armL2.rotation.x = rest.armL2.x + bend * 0.2;
        this.bones.armR2.rotation.x = rest.armR2.x + bend * 0.2;

        this.bones.legL.rotation.x  = rest.legL.x  - swing * 0.15;
        this.bones.legR.rotation.x  = rest.legR.x  + swing * 0.15;
        this.bones.legL2.rotation.x = rest.legL2.x + bend * 0.3;
        this.bones.legR2.rotation.x = rest.legR2.x - bend * 0.3;

        this.bones.finL.rotation.x  = rest.finL.x  + swing * 0.2;
        this.bones.finR.rotation.x  = rest.finR.x  - swing * 0.2;
        this.bones.finL2.rotation.x = rest.finL2.x - bend * 0.2;
        this.bones.finR2.rotation.x = rest.finR2.x + bend * 0.2;
    }
}

function getBindPoseEuler(bone, skeleton) { // Reads a bone's true bind pose (its rotation relative to its parent) out of the skeleton's inverse bind matrices, and hands back plain {x, y, z} radians.
    const boneIndex = skeleton.bones.indexOf(bone);
    const parentIndex = skeleton.bones.indexOf(bone.parent);

    const boneWorldBind = skeleton.boneInverses[boneIndex].clone().invert();
    const parentWorldBind = parentIndex === -1
        ? new THREE.Matrix4()
        : skeleton.boneInverses[parentIndex].clone().invert();

    const localBind = parentWorldBind.clone().invert().multiply(boneWorldBind);
    const euler = new THREE.Euler().setFromRotationMatrix(localBind);

    return { x: euler.x, y: euler.y, z: euler.z };
}