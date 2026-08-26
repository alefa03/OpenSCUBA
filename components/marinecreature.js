import * as THREE from 'three';
import { ModelLoader } from '../utils/model_loader.js';

export class MarineCreature {
    static modelPath = null;
    static _sourcePromise = null; // Model is loaded once and shared; every instance clones it.

    static _getSource() {
        if (!this._sourcePromise) {
            const modelLoader = new ModelLoader();
            this._sourcePromise = modelLoader.loadModel(this.modelPath);
        }
        return this._sourcePromise;
    }

    constructor(scene, options = {}) {
        if (new.target === MarineCreature) {
            throw new Error('MarineCreature is an abstract class and cannot be instantiated.');
        }

        this.scene = scene;
        this.model = null;
        this.bones = null;
        this.scale = options.scale ?? 1.0;
        this.forwardOffset = options.forwardOffset ?? 0;
        this.canCollide = options.canCollide ?? false;

        this.elapsed = Math.random() * 10; // randomization is used to de-syncronize motions between multiple sub-class instances
        this.swimBlend = 0;
        this.targetSwimBlend = 0;
    }

    async init() {

    }

    update(deltaTime) {

    }

    setSwimIntensity(value) {
        this.targetSwimBlend = THREE.MathUtils.clamp(value, 0, 1);
    }

    attachCollisionFlags() {
        if (!this.model) return;

        this.model.userData.canCollide = this.canCollide;
        this.model.traverse((obj) => {
            if (obj.isObject3D) {
                obj.userData.canCollide = this.canCollide;
            }
        });
    }
}

export class SmallMarineCreature extends MarineCreature {
    constructor(scene, options = {}) {
        if (new.target === SmallMarineCreature) {
            throw new Error('SmallMarineCreature is an abstract class and cannot be instantiated.');
        }

        super(scene, options);

        // wandering configuration and state
        this.wanderBounds = options.bounds || { center: new THREE.Vector3(0, 5, 0), radius: 5 };
        this.wanderSpeed = options.speed ?? (0.6 + Math.random() * 0.4);
        this.idleDuration = options.idleDuration || [2, 6]; // [min, max] random pause at each stop (in seconds)
        this.wanderTarget = new THREE.Vector3();
        this.currentSpeed = 0;
        this.isIdling = true; // start with a brief pause instead of an immediate dash
        this.idleTimer = Math.random() * this.idleDuration[1];
        this._pickNewWanderTarget();
    }
    
    _pickNewWanderTarget() {
        const { center, radius } = this.wanderBounds;
        this.wanderTarget.set(
            center.x + (Math.random() * 2 - 1) * radius,
            center.y + (Math.random() * 2 - 1) * radius * 0.4,
            center.z + (Math.random() * 2 - 1) * radius
        );
    }

    _updateWander(deltaTime) {
        if (!this.model) return 0;

        const dt = Math.min(deltaTime, 0.1); // deltaTime clamp: caps how far a single call can move/rotate this creature.

        if (this.isIdling) { // moving-to-stop easing
            this.idleTimer -= dt;
            this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, Math.min(1, dt * 3));
            if (this.idleTimer <= 0) {
                this.isIdling = false;
                this._pickNewWanderTarget();
            }
            return 0.1; // idle animation only
        }

        const toTarget = this.wanderTarget.clone().sub(this.model.position);
        const distance = toTarget.length();

        if (distance < 1.5) {
            this.isIdling = true;
            this.idleTimer = THREE.MathUtils.lerp(this.idleDuration[0], this.idleDuration[1], Math.random());
            return 0.1;
        }

        toTarget.normalize();

        const brakingDistance = 3; // slow down on approach
        const targetSpeed = this.wanderSpeed * THREE.MathUtils.clamp(distance / brakingDistance, 0.25, 1);
        this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, Math.min(1, dt * 1.5));

        this.model.position.addScaledVector(toTarget, this.currentSpeed * dt);

        const lookMatrix = new THREE.Matrix4().lookAt(
            this.model.position,
            this.model.position.clone().add(toTarget),
            THREE.Object3D.DEFAULT_UP
        );
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);
        if (this.forwardOffset) {
            targetQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.forwardOffset));
        }
        this.model.quaternion.slerp(targetQuat, Math.min(1, dt * 2));

        return THREE.MathUtils.clamp(this.currentSpeed / this.wanderSpeed, 0, 1);
    }
}

export class LargeMarineCreature extends MarineCreature {
    constructor(scene, options = {}) {
        if (new.target === LargeMarineCreature) {
            throw new Error('LargeMarineCreature is an abstract class and cannot be instantiated.');
        }

        super(scene, options);

        this.canCollide = options.canCollide ?? true;
    }

    async init() {

    }

    _normalizeName(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    _findBone(model, targetName) {
        const target = this._normalizeName(targetName);
        let found = null;

        model.traverse((obj) => {
            if (!found && obj.name && this._normalizeName(obj.name) === target) {
                found = obj;
            }
        });

        return found;
    }

    update(deltaTime) {

    }
}