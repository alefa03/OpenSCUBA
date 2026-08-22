import * as THREE from 'three';
import { WaterShader } from '../shaders/water_shader.js';

export class Water {
    constructor(scene, waterlevel = 60) {
        const waterShader = new WaterShader();

        const waterGeometry = new THREE.PlaneGeometry(800, 800, 128, 128);
        waterGeometry.rotateX(-Math.PI / 2);

        const mergedUniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib['fog'],
            waterShader.uniforms
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

        this.mesh.updateMatrixWorld();
        this.mesh.material.uniforms.uNormalMatrix.value.getNormalMatrix(this.mesh.matrixWorld);
    }

    update(time, sun) {
        const uniforms = this.mesh.material.uniforms;

        uniforms.uTime.value = time * 0.001; // Converts to seconds

        if (sun) {
            uniforms.uSunPosition.value.copy(sun.sunMesh.position);
            uniforms.uSunColor.value.copy(sun.sunLight.color);
            uniforms.uSunIntensity.value = sun.sunLight.intensity;
        }

        this.mesh.updateMatrixWorld();
        uniforms.uNormalMatrix.value.getNormalMatrix(this.mesh.matrixWorld);
    }
}