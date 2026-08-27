import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { LargeMarineCreature } from "../marinecreature";

const TAIL_CHAIN = [
    'joint2_00',
	'joint8_03',
	'joint3_04',
	'joint14_05',
    'joint4_06',
    'joint5_07'
];

function normalizeName(name) {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBone(model, targetName) {
	const target = normalizeName(targetName);
	let found = null;

	model.traverse((obj) => {
		if (!found && obj.name && normalizeName(obj.name) === target) {
			found = obj;
		}
	});

	return found;
}

export class KillerWhale extends LargeMarineCreature {
	static modelPath = `${import.meta.env.BASE_URL}assets/marine_creatures/killer_whale.glb`;

	constructor(scene, options = {}) {
		super(scene, options);

		this.swimSpeed = options.swimSpeed ?? 2.0;
		this.tailAmplitude = options.tailAmplitude ?? 0.28;
		this.collisionPadding = options.collisionPadding ?? new THREE.Vector3(0.5, 1.2, 0.5);
		
		this.swimTime = 0;

		this.init();
	}

	async init() {
		const { model: sourceModel } = await KillerWhale._getSource();
		const model = clone(sourceModel);

		model.traverse((obj) => {
			if (obj.isMesh || obj.isSkinnedMesh) {
				obj.castShadow = true;
				obj.receiveShadow = false;
			}
		});

		model.position.set(60, 15, 0);
		model.scale.multiplyScalar(this.scale);
		this.scene.add(model);
		this.model = model;
		this.attachCollisionFlags();

		this.bones = {
			tail: TAIL_CHAIN.map((name) => findBone(model, name)),
		};
	}

	update(deltaTime) {
		if (!this.model || !this.bones) return;

		this.swimTime += deltaTime;
		const wave = Math.sin(this.swimTime * this.swimSpeed);

		this.bones.tail.forEach((bone, i) => {
			const t = (i + 1) / this.bones.tail.length;
			this._wag(bone, wave * this.tailAmplitude * t);
		});

		const prevX = this.model.position.x;
		const prevZ = this.model.position.z;

		const newPos = this._ellipsoidalTrajectory(this.swimTime, 130, 1, Math.PI/22, 0, 0, Math.PI);
		this.model.position.set(newPos.x, this.model.position.y, newPos.z);

		const dx = this.model.position.x - prevX;
		const dz = this.model.position.z - prevZ;

		if (dx !== 0 || dz !== 0) {
			const yaw = Math.atan2(dx, dz) - Math.PI / 2;
			this.model.rotation.set(0, yaw + this.forwardOffset, 0);
		}
	}

	_wag(bone, angle) {
		if (!bone) return;
		bone.rotation.set(angle, bone.rotation.y, bone.rotation.z);
	}

	_ellipsoidalTrajectory(t, radius_x, radius_z, speed, cx = 0, cz = 0, phase = 0) {
        const angle = speed * t + phase;
        return {
            x: cx + radius_x * Math.cos(angle),
            z: cz + radius_z * Math.sin(angle),
        };
    }
}