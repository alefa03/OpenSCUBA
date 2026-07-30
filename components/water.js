import * as THREE from 'three';
import { WaterShader } from '../shaders/water_shader.js';

export class Water {
    constructor(scene, waterlevel = 60) {
        const waterShader = new WaterShader();

        const waterGeometry = new THREE.PlaneGeometry(800, 800, 128, 128);
        waterGeometry.rotateX(-Math.PI / 2);

        
        const mergedUniforms = THREE.UniformsUtils.merge([
           THREE.UniformsLib['fog'],
            {
                uTime: { value: 0 }
            }
        ]);

        const waterMaterial = new THREE.ShaderMaterial({
        vertexShader: waterShader.VertexShader,
        fragmentShader: waterShader.FragmentShader,
        uniforms: mergedUniforms,
        fog: true,
        transparent: true,
        side: THREE.DoubleSide
        });

        this.waterLevel = waterlevel;

        this.mesh = new THREE.Mesh(waterGeometry, waterMaterial);
        
        this.mesh.position.y = this.waterLevel; // Water surface height

        scene.add(this.mesh);
    }

    update(time) {
        this.mesh.material.uniforms.uTime.value = time * 0.001; // Convert to seconds
    }
}