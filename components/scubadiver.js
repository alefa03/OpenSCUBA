import * as THREE from 'three';
import { ModelLoader } from '../utils/model_loader.js';

export class ScubaDiver {
    #flashlightdebug = false;
    #creatureCollisionDebug = false;

    constructor(scene, camera, controls, audioManager = null) {
        this.scene = scene;
        this.model = null;
        this.bones = null;
        this.restRotation = null;
        this.elapsed = 0;
        this.swimBlend = 0;
        this.camera = camera;
        this.controls = controls;
        this.audioManager = audioManager;
        this.localOffset = new THREE.Vector3(0, -3, -3.5);
        this.collisionOffset = new THREE.Vector3(0.15, 0.15, 0.15);
        this.diverRadius = 0.6; // sphere radius used for scenery push-out collision
        this._creatureBoxHelpers = new Map();

        this.flashlight = new THREE.SpotLight(0xfeffb7, 100, 30, Math.PI/3, 0.5, 2);
        this.flashlight.castShadow = true; // Enable shadow casting for the light
        this.flashlight.shadow.mapSize.width = 1024;
        this.flashlight.shadow.mapSize.height = 1024;
        this.flashlight.shadow.camera.near = 1;
        this.flashlight.shadow.camera.far = 30; 
        this.flashlight.shadow.bias = -0.001; // A slight negative bias to help prevent "shadow acne"
        this.flashlight.visible = false; // Flashlight is off by default

        if (this.#flashlightdebug) {
            this._spotLightHelper = new THREE.SpotLightHelper(this.flashlight);
            this.scene.add(this._spotLightHelper);
        }

        this.init();
    }

    async init() {
        const modelLoader = new ModelLoader();
        const {model} = await modelLoader.loadModel(`${import.meta.env.BASE_URL}assets/nanando_diver.glb`);

        model.scale.multiplyScalar(0.5);
        model.rotation.order = 'YXZ';

        for (const flashlightName of ['Object_22', 'Object_23']) {
            const flashlight = model.getObjectByName(flashlightName);
            if (flashlight) flashlight.visible = false;
        }

        this.flashlight.position.set(0, 2, 4);
        this.flashlight.target.position.set(0, -2, 14);
        model.add(this.flashlight);
        model.add(this.flashlight.target);

        model.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
            }
        });

        this.scene.add(model);
        this.model = model;

        let skeleton = null;
        model.traverse((obj) => {
            if (!skeleton && obj.isSkinnedMesh) skeleton = obj.skeleton;
        });

        this.bones = {
            spine: model.getObjectByName('mixamorigSpine_53'),
            head:  model.getObjectByName('mixamorigHead_1'),

            armL:  model.getObjectByName('mixamorigLeftArm_25'),
            armR:  model.getObjectByName('mixamorigRightArm_49'),
            armL2: model.getObjectByName('mixamorigLeftForeArm_24'),
            armR2: model.getObjectByName('mixamorigRightForeArm_48'),

            legL:  model.getObjectByName('mixamorigLeftUpLeg_58'),
            legR:  model.getObjectByName('mixamorigRightUpLeg_63'),
            legL2: model.getObjectByName('mixamorigLeftLeg_57'),
            legR2: model.getObjectByName('mixamorigRightLeg_62'),

            finL:  model.getObjectByName('mixamorigLeftFoot_56'),
            finR:  model.getObjectByName('mixamorigRightFoot_61'),
            finL2:  model.getObjectByName('mixamorigLeftToeBase_55'),
            finR2:  model.getObjectByName('mixamorigRightToeBase_60')
        };

        if (this.audioManager) {
            await this.audioManager.load('splash', `${import.meta.env.BASE_URL}sounds/splash.mp3`, false, 0.8);
            await this.audioManager.load('flashlight_click', `${import.meta.env.BASE_URL}sounds/flashlight_click.mp3`, false, 1);
            if (this.bones.head) {
                await this.audioManager.load('scuba_bubbles', `${import.meta.env.BASE_URL}sounds/scuba_bubbles.mp3`, true, 0.06, true, this.bones.head);
            }
        }

        for (const bone of skeleton.bones) {
            const rest = getBindPoseEuler(bone, skeleton);
            bone.rotation.set(rest.x, rest.y, rest.z);
        }

        this.restRotation = {};
        for (const [name, bone] of Object.entries(this.bones)) {
            if (!bone) {
                console.warn(`ScubaDiver: bone "${name}" not found in model`);
                continue;
            }
            this.restRotation[name] = { x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z };
        }

        window.addEventListener('keydown', (event) => { // Key listener for 'Flashlight on/off' command
            if (event.key.toLowerCase() === 'f') {
                if (!this.controls.enabled) {return;}
                this.flashlight.visible = !this.flashlight.visible;
                this.audioManager.stop('flashlight_click');
                this.audioManager.play('flashlight_click');
            }
        });
    }

    update(deltaTime) {
        if (!this.bones || !this.restRotation) return;

        if (this.#flashlightdebug && this._spotLightHelper) this._spotLightHelper.update();

        const diverCollisionPosition = this.getCollisionPosition();

        let resolvedPosition = this.resolveCreaturePushback(diverCollisionPosition);
        resolvedPosition = this.resolveSceneryPushback(resolvedPosition);
        this.camera.position.add(resolvedPosition.clone().sub(diverCollisionPosition));

        if (this.camera) { // If a valid camera object was passed to the class constructor, the model gets attached to its frame.
            const worldOffset = this.localOffset.clone().applyQuaternion(this.camera.quaternion);
            this.model.position.copy(this.camera.position).add(worldOffset);

            const cameraEuler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
            const cameraYaw = cameraEuler.y;
            const cameraPitch = cameraEuler.x;

            const maxBodyPitch = Math.PI/4;
            const bodyPitch = THREE.MathUtils.clamp(cameraPitch, -maxBodyPitch, maxBodyPitch);
            this.model.rotation.order = 'YXZ';

            const cursorX = this.controls ? THREE.MathUtils.clamp(this.controls.mouse.x, -1, 1) : 0;
            const cursorY = this.controls ? THREE.MathUtils.clamp(this.controls.mouse.y, -1, 1) : 0;

            this.model.rotation.set(-bodyPitch + (cursorY * Math.PI/12), (cameraYaw + Math.PI) + (-cursorX * Math.PI/8), 0);
            
            if (this.bones.head && this.restRotation.head) {
                const maxHeadRotation = Math.PI/6;
                const headPitch = -cursorY * maxHeadRotation;
                const headYaw = -cursorX * maxHeadRotation;

                this.bones.head.rotation.x = -(this.restRotation.head.x + headPitch);
                this.bones.head.rotation.y = this.restRotation.head.y + headYaw;
            }
        }
        
        // Scuba Diver Animations
        this.elapsed += deltaTime;

        const swimTarget = this.controls.isMovingForward ? 1 : 0;
        const blendSpeed = 8;
        const blendFactor = 1 - Math.exp(-blendSpeed * deltaTime);
        this.swimBlend = THREE.MathUtils.lerp(this.swimBlend, swimTarget, blendFactor);
        const swimBlend = this.swimBlend; // 'swimBlend' is used to ensure a smooth transition between the 'idle' and the 'swimming' animations, making the movements look more natural.

        const speed = this.controls.isMovingForward ? 0.4*this.controls.speed : 2.2;
        const rest = this.restRotation;

        const swing = Math.sin(this.elapsed * speed);
        const bend = Math.sin(this.elapsed * speed + Math.PI / 2);

        const lerpRotation = (bone, axis, idleTarget, swimTarget) => { // Utility function to apply 'lerp' more easily
            bone.rotation[axis] = THREE.MathUtils.lerp(idleTarget, swimTarget, swimBlend);
        };

        const idleSpineX = rest.spine.x + swing * 0.01;
        const swimSpineX = rest.spine.x + swing * 0.05;
        lerpRotation(this.bones.spine, 'x', idleSpineX, swimSpineX);

        const idleArmLX = rest.armL.x - swing * 0.1;
        const idleArmLZ = rest.armL.z;
        const swimArmLX = rest.armL.x;
        const swimArmLZ = rest.armL.z - swing * 0.25;
        lerpRotation(this.bones.armL, 'x', idleArmLX, swimArmLX);
        lerpRotation(this.bones.armL, 'z', idleArmLZ, swimArmLZ);

        const idleArmRX = rest.armR.x - swing * 0.1;
        const idleArmRZ = rest.armR.z;
        const swimArmRX = rest.armR.x;
        const swimArmRZ = rest.armR.z - swing * 0.25;
        lerpRotation(this.bones.armR, 'x', idleArmRX, swimArmRX);
        lerpRotation(this.bones.armR, 'z', idleArmRZ, swimArmRZ);

        const idleArmL2X = rest.armL2.x - bend * 0.05;
        const idleArmL2Z = rest.armL2.z;
        const swimArmL2X = rest.armL2.x;
        const swimArmL2Z = rest.armL2.z - bend * 0.2;
        lerpRotation(this.bones.armL2, 'x', idleArmL2X, swimArmL2X);
        lerpRotation(this.bones.armL2, 'z', idleArmL2Z, swimArmL2Z);

        const idleArmR2X = rest.armR2.x - bend * 0.05;
        const idleArmR2Z = rest.armR2.z;
        const swimArmR2X = rest.armR2.x;
        const swimArmR2Z = rest.armR2.z - bend * 0.2;
        lerpRotation(this.bones.armR2, 'x', idleArmR2X, swimArmR2X);
        lerpRotation(this.bones.armR2, 'z', idleArmR2Z, swimArmR2Z);

        const idleLegLX = rest.legL.x - swing * 0.01;
        const swimLegLX = rest.legL.x - swing * 0.15;
        lerpRotation(this.bones.legL, 'x', idleLegLX, swimLegLX);

        const idleLegRX = rest.legR.x + swing * 0.01;
        const swimLegRX = rest.legR.x + swing * 0.15;
        lerpRotation(this.bones.legR, 'x', idleLegRX, swimLegRX);

        const idleLegL2X = rest.legL2.x + bend * 0.02;
        const swimLegL2X = rest.legL2.x + bend * 0.3;
        lerpRotation(this.bones.legL2, 'x', idleLegL2X, swimLegL2X);

        const idleLegR2X = rest.legR2.x - bend * 0.02;
        const swimLegR2X = rest.legR2.x - bend * 0.3;
        lerpRotation(this.bones.legR2, 'x', idleLegR2X, swimLegR2X);

        const idleFinLX = rest.finL.x + swing * 0.05;
        const swimFinLX = rest.finL.x + swing * 0.2;
        lerpRotation(this.bones.finL, 'x', idleFinLX, swimFinLX);

        const idleFinRX = rest.finR.x - swing * 0.05;
        const swimFinRX = rest.finR.x - swing * 0.2;
        lerpRotation(this.bones.finR, 'x', idleFinRX, swimFinRX);

        const idleFinL2X = rest.finL2.x - bend * 0.05;
        const swimFinL2X = rest.finL2.x - bend * 0.2;
        lerpRotation(this.bones.finL2, 'x', idleFinL2X, swimFinL2X);

        const idleFinR2X = rest.finR2.x + bend * 0.05;
        const swimFinR2X = rest.finR2.x + bend * 0.2;
        lerpRotation(this.bones.finR2, 'x', idleFinR2X, swimFinR2X);
    }

    getCollisionPosition() {
        return this.camera.position.clone().add(
            this.localOffset.clone().applyQuaternion(this.camera.quaternion)
        );
    }

    resolveCreaturePushback(desiredPosition) { // Creatures collision detection
        const result = desiredPosition.clone();
        const visited = this.#creatureCollisionDebug ? new Set() : null;

        this.scene.traverse((object) => {
            if (!object.userData?.canCollide || object.userData?.isScenery || !(object.isMesh || object.isSkinnedMesh)) return;

            object.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(object);
            const boxCenter = box.getCenter(new THREE.Vector3());
            const boxHalfSize = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
            const min = boxCenter.clone().sub(boxHalfSize).sub(this.collisionOffset);
            const max = boxCenter.clone().add(boxHalfSize).add(this.collisionOffset);

            if (this.#creatureCollisionDebug) {
                visited.add(object);
                this._updateCreatureDebugHelper(object, min, max);
            }

            const isInsideX = result.x >= min.x && result.x <= max.x;
            const isInsideY = result.y >= min.y && result.y <= max.y;
            const isInsideZ = result.z >= min.z && result.z <= max.z;

            if (!(isInsideX && isInsideY && isInsideZ)) return;

            // Signed distance needed to push the diver out through the nearest face on each axis.
            const pushX = (result.x - min.x) < (max.x - result.x) ? -(result.x - min.x) : (max.x - result.x);
            const pushY = (result.y - min.y) < (max.y - result.y) ? -(result.y - min.y) : (max.y - result.y);
            const pushZ = (result.z - min.z) < (max.z - result.z) ? -(result.z - min.z) : (max.z - result.z);

            const absX = Math.abs(pushX);
            const absY = Math.abs(pushY);
            const absZ = Math.abs(pushZ);
            const minAbs = Math.min(absX, absY, absZ);

            // Push out along whichever axis requires the least displacement (avoids the diver to get stuck inside a bounding box)
            if (minAbs === absX) {
                result.x += pushX;
            } else if (minAbs === absY) {
                result.y += pushY;
            } else {
                result.z += pushZ;
            }
        });

        this._pruneCreatureDebugHelpers(visited);

        return result;
    }

    _updateCreatureDebugHelper(object, min, max) { // Creates or repositions the wireframe box used to visualize a creature's live collision volume.
        let helper = this._creatureBoxHelpers.get(object);
        if (!helper) {
            helper = new THREE.Box3Helper(new THREE.Box3(min.clone(), max.clone()), 0xff0000);
            this.scene.add(helper);
            this._creatureBoxHelpers.set(object, helper);
        } else {
            helper.box.min.copy(min);
            helper.box.max.copy(max);
        }
    }

    _pruneCreatureDebugHelpers(visited) { // Removes debug helpers for creatures no longer seen
        if (this._creatureBoxHelpers.size === 0) return;

        for (const [object, helper] of this._creatureBoxHelpers) {
            if (visited && visited.has(object)) continue;

            this.scene.remove(helper);
            helper.dispose();
            this._creatureBoxHelpers.delete(object);
        }
    }
    
    resolveSceneryPushback(desiredPosition) { // Scenery collision detection
        const result = desiredPosition.clone();

        if (typeof this.diverRadius !== 'number' || Number.isNaN(this.diverRadius)) {
            console.warn('ScubaDiver: diverRadius is not set! Scenery collision is disabled.');
            return result;
        }

        this.scene.traverse((object) => {
            if (!object.userData?.isCollidable || !object.geometry?.boundsTree) return;

            object.updateMatrixWorld(true);

            const worldScale = object.getWorldScale(new THREE.Vector3()).x;
            const localRadius = this.diverRadius / worldScale;

            const localPos = result.clone().applyMatrix4(object.matrixWorld.clone().invert());
            const hit = object.geometry.boundsTree.closestPointToPoint(localPos, {}, 0, localRadius);
            if (!hit || !hit.point) return;

            const worldHitPoint = hit.point.clone().applyMatrix4(object.matrixWorld);
            const away = result.clone().sub(worldHitPoint);
            const dist = away.length();

            if (dist < this.diverRadius) {
                const pushDir = dist > 1e-5 ? away.normalize() : new THREE.Vector3(0, 1, 0);
                result.add(pushDir.multiplyScalar(this.diverRadius - dist));
            }
        });

        return result;
    }

    playSplashSound() {
        this.audioManager.play('splash');
    }

    playBreathingSound() {
        this.audioManager.play('scuba_bubbles');
    }
}

function getBindPoseEuler(bone, skeleton) {
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