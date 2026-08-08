// src/utils/ModelLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.loader.setMeshoptDecoder(MeshoptDecoder);
    }

    loadModel(url) { // Loads a model and returns both the mesh and its animations
        return new Promise((resolve, reject) => {
            const fileName = url.split('/').pop().split('?')[0].split('#')[0];

            this.loader.load(
                url,
                (gltf) => {
                    console.log(`3D Model "${fileName}" loaded!`);

                    resolve({
                        model: gltf.scene, // 3D group/mesh
                        animations: gltf.animations // array of animation clips
                    });
                },
                (xhr) => {
                    //console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`); // Tracks loading progress
                },
                (error) => {
                    console.error(`Failed to load model from ${url}`, error);
                    reject(error);
                }
            );
        });
    }

    setupAnimation(model, animations, animationIndex = 0) { // Helper to set up an AnimationMixer for a loaded model
        if (!animations || animations.length === 0) {
            console.warn('No animations found for this model.');
            return null;
        }

        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(animations[animationIndex]);
        action.play();

        return mixer;
    }
}