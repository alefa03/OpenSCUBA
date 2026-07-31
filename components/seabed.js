import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { TextureLoader } from '../utils/texture_loader.js';

export class Seabed {
    constructor(scene) {
        const seabed = new THREE.PlaneGeometry(800, 800, 128, 128);
        seabed.rotateX(-Math.PI / 2);

        // creates a wavy effect on the seabed, making it more realistic.
        const noise2D = createNoise2D();
        const positions = seabed.attributes.position;
        var irregularity = 0.5; // controls the height of the seabed's waves, making it more or less pronounced.

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            
            const y = noise2D(x * 0.05, z * 0.05) * irregularity;

            positions.setY(i, y);
        }
        seabed.computeVertexNormals(); // used to make sure light is reflected properly accross the seabed surface.

        this.material = new THREE.MeshStandardMaterial({ 
            color: 0xc2b280, // Sand color
            roughness: 1.0,
            metalness: 0.0,
            map: TextureLoader.load_texture('../textures/Texturelabs_Soil_126XL.jpg', 40)
        });

        this.mesh = new THREE.Mesh(seabed, this.material);
        this.mesh.receiveShadow = true;

        scene.add(this.mesh);
    }

    update(time) {
        
    }
}