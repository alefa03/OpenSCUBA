import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { LargeMarineCreature } from "../marinecreature";

const SPINE_CHAIN = [
    'Spine.001_45',
    'Spine.002_44',
    'Spine.003_41',
    'Spine.004_40',
    'Spine.005_39',
    'Spine.006_38',
    'Spine.007_37',
    'Spine.008_36',
];

const PEDUNCLE = 'Caudal peduncle_35';

const TAIL_DORSAL_CHAIN = [
    'Caudal fin dorsal.001_28',
    'Caudal fin dorsal.002_27',
    'Caudal fin dorsal.003_26',
    'Caudal fin dorsal.004_25',
    'Caudal fin dorsal.005_24',
    'Caudal fin dorsal.006_23',
    'Caudal fin dorsal.007_22',
    'Caudal fin dorsal.008_21',
    'Caudal fin dorsal.009_20',
];

const TAIL_VENTRAL_CHAIN = [
    'Caudal fin ventral.001_34',
    'Caudal fin ventral.002_33',
    'Caudal fin ventral.003_32',
    'Caudal fin ventral.004_31',
    'Caudal fin ventral.005_30',
    'Caudal fin ventral.006_29',
];

const CRANIUM = 'Cranium_55';

export class WhaleShark extends LargeMarineCreature {
    static modelPath = '../assets/marine_creatures/whale_shark.glb';

    constructor(scene, options = {}) {
        super(scene, options);

        this.swimSpeed = options.swimSpeed ?? 1.2;              // radians/sec fed into the sine wave
        this.spineAmplitude = options.spineAmplitude ?? 0.12;   // max bend at the base of the spine, in radians
        this.tailAmplitude = options.tailAmplitude ?? 0.15;     // max bend at the tail fin tips, in radians
        this.headAmplitude = options.headAmplitude ?? 0.12;     // max sway of the head, in radians

        this.swimTime = 0;

        this.init();
    }

    async init() {
        const { model: sourceModel } = await WhaleShark._getSource();

        const model = clone(sourceModel);

        model.traverse((obj) => {
            if (obj.isMesh || obj.isSkinnedMesh) {
                obj.castShadow = true;
                obj.receiveShadow = false;
            }
        });

        model.position.set(60, 40, 0);
        model.scale.multiplyScalar(this.scale);
        this.scene.add(model);
        this.model = model;
        this.attachCollisionFlags();

        this.bones = {
            spine: SPINE_CHAIN.map((name) => this._findBone(model, name)),
            peduncle: this._findBone(model, PEDUNCLE),
            tailDorsal: TAIL_DORSAL_CHAIN.map((name) => this._findBone(model, name)),
            tailVentral: TAIL_VENTRAL_CHAIN.map((name) => this._findBone(model, name)),
            cranium: this._findBone(model, CRANIUM),
        };
    }

    update(deltaTime) {
        if (!this.model || !this.bones) return;

        this.swimTime += deltaTime;
        const wave = Math.sin(this.swimTime * this.swimSpeed);

        this.bones.spine.forEach((bone, i) => {
            const t = (i + 1) / this.bones.spine.length;
            this._wag(bone, wave * this.spineAmplitude * t);
        });

        this._wag(this.bones.peduncle, wave * this.tailAmplitude * 0.3);
        this.bones.tailDorsal.forEach((bone, i) => {
            const t = (i + 1) / this.bones.tailDorsal.length;
            this._wag(bone, wave * this.tailAmplitude * t);
        });
        this.bones.tailVentral.forEach((bone, i) => {
            const t = (i + 1) / this.bones.tailVentral.length;
            this._wag(bone, wave * this.tailAmplitude * t);
        });

        this._wag(this.bones.cranium, -wave * this.headAmplitude);

        const prevX = this.model.position.x;
        const prevZ = this.model.position.z;

        const newPos = this._circularTrajectory(this.swimTime, 100, 0.025);
        this.model.position.set(newPos.x, this.model.position.y, newPos.z);

        const dx = this.model.position.x - prevX;
        const dz = this.model.position.z - prevZ;

        if (dx !== 0 || dz !== 0) {
            const yaw = Math.atan2(dx, dz) - Math.PI/2;
            const modelForwardOffset = this.forwardOffset;
            this.model.rotation.set(0, yaw + modelForwardOffset, 0);
        }
    }

    _wag(bone, angle) {
        if (!bone) return;
        bone.rotation.set(angle, bone.rotation.y, bone.rotation.z);
    }

    _circularTrajectory(t, radius, speed, cx = 0, cz = 0, phase = 0) {
        const angle = speed * t + phase;

        return {x: cx + radius * Math.cos(angle), z: cz + radius * Math.sin(angle)};
    }
}