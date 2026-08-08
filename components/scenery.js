import * as THREE from 'three';
import { ModelLoader } from "../utils/model_loader.js";
import { TextureLoader } from "../utils/texture_loader.js";

export class Scenery {
    #model;

    constructor(scene, path, scale = 1.0, position = new THREE.Vector3(0, 0, 0), rotation = new THREE.Vector3(0, 0, 0), canCollide = true, texturePath = null, textureRepeat = 1) {
        if (!scene) throw Error("No scene specified!");
        if (!path) throw Error("No path specified!");

        const modelLoader = new ModelLoader();
        this.scene = scene;
        this.#model = null;

        this.canCollide = canCollide;
        this._scale = scale;
        this._position = position;
        this._rotation = rotation;

        let customTexture = null;
        if (texturePath) { // Loads a custom texture if a path is provided
            customTexture = TextureLoader.load_texture(texturePath, textureRepeat);
        }

        modelLoader.loadModel(path)
            .then(({ model }) => {
                this.#model = model;

                this.#model.traverse((obj) => {
                    if (!(obj.isMesh || obj.isSkinnedMesh)) return;

                    obj.castShadow = true;
                    obj.receiveShadow = true;

                    if (customTexture) { // If present, a custom texture is applied to the material's map
                        if (!obj.geometry.attributes.uv) generateTriplanarUVs(obj.geometry, 0.5 / this._scale);
                        if (!obj.material.map) obj.material = obj.material.clone();
                        obj.material.map = customTexture;
                        obj.material.needsUpdate = true;
                    }

                    if (this.canCollide) {
                        obj.geometry.computeBoundsTree();
                        obj.userData.isCollidable = true;
                    }
                });

                this.#model.scale.multiplyScalar(this._scale); // uniform scale
                this.#model.position.copy(this._position);
                this.#model.rotation.set(this._rotation.x, this._rotation.y, this._rotation.z);

                this.scene.add(this.#model);
            })
            .catch((error) => console.error(`Failed to load scenery from ${path}`, error));
    }

    set_scale(new_scale) {
        this._scale = new_scale;
        if (this.#model) this.#model.scale.setScalar(new_scale);
    }
    set_position(new_position) {
        this._position = new_position;
        if (this.#model) this.#model.position.copy(new_position);
    }
    set_rotation(new_rotation) {
        this._rotation = new_rotation;
        if (this.#model) this.#model.rotation.set(new_rotation.x, new_rotation.y, new_rotation.z);
    }
}

function generateTriplanarUVs(geometry, scale = 1) { // Utility function that fixes models that don't have a UV mapping for textures
    geometry.computeVertexNormals();
    const pos = geometry.attributes.position;
    const norm = geometry.attributes.normal;
    const uv = new Float32Array(pos.count * 2);

    for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(norm.getX(i)), ny = Math.abs(norm.getY(i)), nz = Math.abs(norm.getZ(i));
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (ny >= nx && ny >= nz) {
            uv[i*2] = x * scale; uv[i*2+1] = z * scale;
        } else if (nx >= ny && nx >= nz) {
            uv[i*2] = z * scale; uv[i*2+1] = y * scale;
        } else {
            uv[i*2] = x * scale; uv[i*2+1] = y * scale;
        }
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}