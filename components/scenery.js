import * as THREE from 'three';
import { ModelLoader } from "../utils/model_loader.js";
import { TextureLoader } from "../utils/texture_loader.js";

const MATERIAL_PROPERTY_BY_TEXTURE_TYPE = { // Maps a texture type to the MeshStandardMaterial property it belongs on.
    color: 'map',
    normal: 'normalMap',
    roughness: 'roughnessMap',
    metalness: 'metalnessMap',
    ao: 'aoMap',
    emissive: 'emissiveMap',
};

export class Scenery {
    #model;
    #litMaterials = []; // List of materials with an emissive tint whose intensity should track scene lighting

    constructor(scene, path, scale = 1.0, position = new THREE.Vector3(0, 0, 0), rotation = new THREE.Vector3(0, 0, 0), canCollide = true, texturePath = null, textureRepeat = 1, textureType = 'color') {
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
            customTexture = TextureLoader.load_texture(texturePath, textureRepeat, textureType);
        }

        modelLoader.loadModel(path)
            .then(({ model }) => {
                this.#model = model;

                this.#model.traverse((obj) => {
                    if (!(obj.isMesh || obj.isSkinnedMesh)) return;

                    obj.castShadow = true;
                    obj.receiveShadow = true;

                    ensureLitMaterial(obj); // Converts any KHR_materials_unlit meshes so that they respond to scene lighting
                    const litMaterials = normalizeScanMaterial(obj.material);
                    this.#litMaterials.push(...litMaterials);

                    if (customTexture) { // If present, a custom texture is applied to the material slot matching its type
                        if (!obj.geometry.attributes.uv) generateTriplanarUVs(obj.geometry, 0.5 / this._scale);
                        const targetProperty = MATERIAL_PROPERTY_BY_TEXTURE_TYPE[textureType] ?? 'map';
                        if (!obj.material[targetProperty]) obj.material = obj.material.clone();
                        obj.material[targetProperty] = customTexture;
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

    setLightLevel(level) { // Calls every frame with a 0-1 value representing how lit the scene currently is
        for (const mat of this.#litMaterials) {
            mat.emissiveIntensity = level;
        }
    }
}

function ensureLitMaterial(obj) { // Utility function to swap KHR_materials_unlit for a lit equivalent so that real lighting (and the normalizeScanMaterial function) can apply
    const isArray = Array.isArray(obj.material);
    const materials = isArray ? obj.material : [obj.material];

    const converted = materials.map((mat) => {
        if (!mat || !mat.isMeshBasicMaterial) return mat; // already lit, nothing to do

        const standard = new THREE.MeshStandardMaterial({
            map: mat.map,
            color: mat.color,
            transparent: mat.transparent,
            opacity: mat.opacity,
            alphaTest: mat.alphaTest,
            side: mat.side,
            vertexColors: mat.vertexColors,
            roughness: 1,
            metalness: 0,
        });
        standard.name = mat.name;
        mat.dispose();
        return standard;
    });

    obj.material = isArray ? converted : converted[0];
}

function normalizeScanMaterial(material) { // Corrects two common photogrammetry/scan export artifacts that make a mesh ignore or fight scene lighting
    if (!material) return [];
    const SCAN_EMISSIVE_TINT = new THREE.Color(0x727272);
    const MAX_SCAN_METALNESS = 0.15;

    const materials = Array.isArray(material) ? material : [material];
    const litMaterials = [];

    for (const mat of materials) {
        if (!mat.isMeshStandardMaterial && !mat.isMeshPhysicalMaterial) continue; // only PBR materials expose emissive/metalness channels

        if (mat.emissiveMap || (mat.emissive && mat.emissive.getHex() !== 0x000000)) { // An eventual already existing emissiveMap in the model is kept, but it is recolored to a tuned tint and its strength is tuned
            mat.emissive.copy(SCAN_EMISSIVE_TINT);
            mat.emissiveIntensity = 0;
            mat.needsUpdate = true;
            litMaterials.push(mat);
        }

        if (mat.metalnessMap && mat.metalness > MAX_SCAN_METALNESS) { // Caps metalness so diffuse color isn't mostly discarded under ambient-only lighting
            mat.metalness = MAX_SCAN_METALNESS;
            mat.needsUpdate = true;
        }
    }

    return litMaterials;
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