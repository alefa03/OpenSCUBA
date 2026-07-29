import * as THREE from 'three';
import { Seabed } from '../components/seabed.js';
import { Water } from '../components/water.js';
import { Controls } from './controls.js'
import { AudioManager } from '../utils/audio_manager.js';


export class World {
    constructor(container) {
        this.timer = new THREE.Timer();

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.renderer.setClearColor(0x006994);

        this.scene.fog = new THREE.FogExp2(0x006994, 0.015);
        
        this.ambientLight = new THREE.AmbientLight(0x000059);
        this.directionalLight = new THREE.DirectionalLight(0xF5E827, 0.5);
        this.directionalLight.position.set(0, 50, 0);

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
        
        // Lighting setup
        this.scene.add(this.ambientLight);
        this.scene.add(this.directionalLight);

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

        this.controls.update(delta);


        this.seabed.update(timestamp);
        this.water.update(timestamp);

        this.renderer.render(this.scene, this.camera);
    }
}