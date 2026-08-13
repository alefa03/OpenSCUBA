import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { LargeMarineCreature } from "../marinecreature";

const LEFT_WING = 'Bone017_012';
const RIGHT_WING = 'Bone017(mirrored)_019';
const LEFT_SUB_WING = 'Bone021_016';
const RIGHT_SUB_WING = 'Bone021(mirrored)_023';

export class MantaRay extends LargeMarineCreature {
    static modelPath = `${import.meta.env.BASE_URL}assets/marine_creatures/manta_ray_texturefix.glb`;

    constructor(scene, options = {}) {
        super(scene, options);

        this.swimSpeed = options.swimSpeed ?? 1.0;
        this.wingAmplitude = options.wingAmplitude ?? 0.15;
        this.subWingAmplitude = options.subWingAmplitude ?? this.wingAmplitude * 1.45;
        this.subWingDelay = options.subWingDelay ?? 0.7;
        this.wingSpread = options.wingSpread ?? 0.2;

        this.swimTime = 0;

        this.init();
    }

    async init() {
        const { model: sourceModel } = await MantaRay._getSource();
        const model = clone(sourceModel);

        model.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) {
                obj.castShadow = true;
                obj.receiveShadow = false;
            }
        });

        model.position.set(0, 22, 0);
        model.scale.multiplyScalar(this.scale);

        this.scene.add(model);
        this.model = model;
        this.attachCollisionFlags();

        this.bones = {
            leftWing: this._findBone(model, LEFT_WING),
            rightWing: this._findBone(model, RIGHT_WING),
            leftSubWing: this._findBone(model, LEFT_SUB_WING),
            rightSubWing: this._findBone(model, RIGHT_SUB_WING),
        };
    }

    update(deltaTime) {
        if (!this.model || !this.bones) return;

        this.swimTime += deltaTime;
        const wave = Math.sin(this.swimTime * this.swimSpeed);
        const subWave = Math.sin(this.swimTime * this.swimSpeed + this.subWingDelay);

        this._wag(this.bones.leftWing, this.wingSpread + wave * this.wingAmplitude);
        this._wag(this.bones.rightWing, -(this.wingSpread + wave * this.wingAmplitude));
        this._wag(this.bones.leftSubWing, this.wingSpread-0.15 - subWave * this.subWingAmplitude);
        this._wag(this.bones.rightSubWing, -(this.wingSpread-0.15 - subWave * this.subWingAmplitude));

        const prevX = this.model.position.x;
        const prevZ = this.model.position.z;

        const newPos = this._ellipsoidalTrajectory(this.swimTime, 60, 40, Math.PI/22, 0, 0, Math.PI);
        this.model.position.set(newPos.x, this.model.position.y, newPos.z);

        const dx = this.model.position.x - prevX;
        const dz = this.model.position.z - prevZ;

        if (dx !== 0 || dz !== 0) {
            const yaw = Math.atan2(dx, dz) - Math.PI / 2;
            this.model.rotation.set(0, yaw + this.forwardOffset, 0);
        }
    }

    _wag(bone, angle) { // utility function to animate each bone in a more handy way
        if (!bone) return;
        bone.rotation.z = angle;
    }

    _ellipsoidalTrajectory(t, radius_x, radius_z, speed, cx = 0, cz = 0, phase = 0) {
        const angle = phase - speed * t;
        return {
            x: cx + radius_x * Math.cos(angle),
            z: cz + radius_z * Math.sin(angle),
        };
    }
}