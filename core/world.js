import * as THREE from 'three';
import { Tweener } from '../utils/tweener.js';
import { Seabed } from '../components/seabed.js';
import { Water } from '../components/water.js';
import { Controls } from './controls.js'
import { AudioManager } from '../utils/audio_manager.js';
import { Sun } from '../components/sun.js';


export class World {
    constructor(container) {
        this.timer = new THREE.Timer();
        this.dayClearColor = new THREE.Color(0x006994);
        this.nightClearColor = new THREE.Color(0x03101e);
        this.currentClearColor = new THREE.Color().copy(this.dayClearColor);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.renderer.setClearColor(this.currentClearColor);

        this.scene.fog = new THREE.Fog(this.currentClearColor, 1, 100);
        
        this.ambientLight = new THREE.AmbientLight(0x0bd7e6);
        //this.directionalLight = new THREE.DirectionalLight(0xF5E827, 0.5);
        //this.directionalLight.position.set(0, 180, 0);

        this.camera.position.y = 5;

        container.append(this.renderer.domElement);

        window.addEventListener('resize', () => { // Handle window resizing
            this.camera.aspect = window.innerWidth / window.innerHeight; // Updates the camera aspect ratio to match the new screen dimensions
            
            this.camera.updateProjectionMatrix();

            // WebGL canvas and renderer resizing
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
        
        this.controls = new Controls(this.camera);
        this.audioManager = new AudioManager(this.camera);

        // Assets instantiation
        this.seabed = new Seabed(this.scene);
        this.water = new Water(this.scene);
        this.sun = new Sun(this.scene);
        
        // Lighting setup
        this.scene.add(this.ambientLight);
        //this.scene.add(this.directionalLight);

        // Background sounds setup
        this.audioManager.load('underwater_ambience', '../sounds/underwater.mp3', true, 0.5)
            .then(() => {
                this.audioManager.play('underwater_ambience');
            })
            .catch((error) => {
                console.error('Error loading background audio:', error);
            });

    }

    start() {
        this.renderer.setAnimationLoop((time) => {
        this.render(time);
        });
    }

    render(timestamp) {
        this.timer.update(timestamp);
        const delta = this.timer.getDelta();
        const elapsed = this.timer.getElapsed();
        const dayDuration = 60;
        const timeOfDay = (15 % dayDuration) / dayDuration;

        this.controls.update(delta);


        this.seabed.update(timestamp);
        this.water.update(timestamp);
        const daylightFactor = this.sun.update(timeOfDay);

        this.ambientLight.intensity = THREE.MathUtils.lerp(0.2, 1.0, daylightFactor);
        this.currentClearColor.copy(this.nightClearColor).lerp(this.dayClearColor, daylightFactor);

        const brightClearColor = this.currentClearColor.clone().lerp(new THREE.Color(0x3de2ff), 0.50);
        const surfaceThreshold = 20;
        let clearColorToUse = this.currentClearColor;

        if (this.camera.position.y > this.water.waterLevel) {
            clearColorToUse = brightClearColor;
        } else if (this.camera.position.y > this.water.waterLevel - surfaceThreshold) {
            const fadeFactor = (this.camera.position.y - (this.water.waterLevel - surfaceThreshold)) / surfaceThreshold;
            clearColorToUse = this.currentClearColor.clone().lerp(brightClearColor, fadeFactor);
        }

        this.renderer.setClearColor(clearColorToUse);
        this.scene.fog.color.copy(clearColorToUse);
        
        if (this.camera.position.y > this.water.waterLevel) {
            this.scene.fog.near = 80;
            this.scene.fog.far = 200;
        } else {
            this.scene.fog.near = 10;
            this.scene.fog.far = 120;
        }

        this.renderer.render(this.scene, this.camera);
    }
}