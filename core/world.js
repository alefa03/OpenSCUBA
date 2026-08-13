import * as THREE from 'three';
import { Seabed } from '../components/seabed.js';
import { Water } from '../components/water.js';
import { Controls } from './controls.js'
import { AudioManager } from '../utils/audio_manager.js';
import { Tweener } from '../utils/tweener.js';
import { GarbageCollector } from '../utils/garbage_collector.js';
import { ScubaDiver } from '../components/scubadiver.js';
import { Sun } from '../components/sun.js';
import { EmperorAngelfish } from '../components/creatures/emperorangelfish.js';
import { CoralFish } from '../components/creatures/coralfish.js';
import { WhaleShark } from '../components/creatures/whaleshark.js';
import { MantaRay } from '../components/creatures/mantaray.js';
import { KillerWhale } from '../components/creatures/killerwhale.js';
import { CreatureWrapper } from '../utils/creature_wrapper.js';
import { Scenery } from '../components/scenery.js';
import { SceneryWrapper } from '../utils/scenery_wrapper.js';
import { Beam } from '../components/beam.js'
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;


export class World {
    #enableworldaxes = false; // set to true to make world frame axes visible

    constructor(container) {
        this.timer = new THREE.Timer();
        this.dayClearColor = new THREE.Color(0x006994);
        this.nightClearColor = new THREE.Color(0x03101e);
        this.currentClearColor = new THREE.Color().copy(this.dayClearColor);
        this.daySkyColor = new THREE.Color(0x3de2ff); // full-brightness above-water color

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.renderer.setClearColor(this.currentClearColor);

        this.scene.fog = new THREE.FogExp2(this.currentClearColor, densityForVisibility(100));
        
        this.ambientLight = new THREE.AmbientLight(0x0bd7e6, 0.2);

        this.camera.position.y = 8;

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
        
        // Essentials
        this.seabed = new Seabed(this.scene);
        this.water = new Water(this.scene);
        this.sun = new Sun(this.scene);

        // Character
        this.scubadiver = new ScubaDiver(this.scene, this.camera, this.controls, this.audioManager);

        // Scenery
        this.wreck = new Scenery(this.scene, `${import.meta.env.BASE_URL}assets/scenery/mcallister_tugboat_1963.glb`, 0.3, new THREE.Vector3(50, 10, 40), new THREE.Vector3(0, -Math.PI/4, 0), true);

        this.ornament = new Scenery(
            this.scene,
            `${import.meta.env.BASE_URL}assets/scenery/fish_tank_ornament.glb`,
            1.0,
            new THREE.Vector3(-19.5, 2.65, -28),
            new THREE.Vector3(0,Math.PI/6,0),
            false
        );

        this.artificialreef = new Scenery(
            this.scene,
            `${import.meta.env.BASE_URL}assets/scenery/artificial_reef_prado_marseilles_france_compressed.glb`,
            6.0,
            new THREE.Vector3(50, 6.8, -180),
            new THREE.Vector3(0,Math.PI/6-Math.PI/4,0),
            true,
            `${import.meta.env.BASE_URL}textures/Texturelabs_Metal_137L.jpg`,
            20
        );

        this.mountain = new Scenery(this.scene, `${import.meta.env.BASE_URL}assets/scenery/rock_mountain.glb`, 100.0, new THREE.Vector3(-160, -1, -80), new THREE.Vector3(0, Math.PI/2.5, 0), true, `${import.meta.env.BASE_URL}textures/Texturelabs_Stone_138L.jpg`, 4);

        // Map Boundaries (realistic walls)
        const wallsPath = `${import.meta.env.BASE_URL}assets/scenery/wall_1_4k.glb`;
        this.walls = new SceneryWrapper(
            this.scene,
            [
                {
                    path: wallsPath,
                    scale: 5.0,
                    position: new THREE.Vector3(10, -12, -180),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: true
                },
                {
                    path: wallsPath,
                    scale: 5.0,
                    position:  new THREE.Vector3(-15, -12, 54),
                    rotation: new THREE.Vector3(0, 0, 0),
                    canCollide: true
                },
                {
                    path: wallsPath,
                    scale: 5.0,
                    position: new THREE.Vector3(230, -12, -130),
                    rotation: new THREE.Vector3(0, Math.PI, 0),
                    canCollide: true
                },
                {
                    path: wallsPath,
                    scale: 5.0,
                    position: new THREE.Vector3(200, -12, 80),
                    rotation: new THREE.Vector3(0, Math.PI/2, 0),
                    canCollide: true
                }
            ],
            new THREE.Vector3(-96, 0, 30)
        );

        this.coralReef = new SceneryWrapper(this.scene, [
            // base rock
            {
                path: `${import.meta.env.BASE_URL}assets/scenery/flat_large_rock.glb`,
                scale: 50,
                position: new THREE.Vector3(0, -4, 0),
                canCollide: true,
                texturePath: `${import.meta.env.BASE_URL}textures/Texturelabs_Stone_157L.jpg`,
                textureRepeat: 50,
            },
            
            {
                path: `${import.meta.env.BASE_URL}assets/scenery/corals/giant_barrel_sponge.glb`,
                scale: 6,
                position: new THREE.Vector3(10, 33.3, 32),
                rotation: new THREE.Vector3(0, 0, 0),
                canCollide: true
            },

            // pocillopora_eydouxi
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/pocillopora_eydouxi.glb`, scale: 0.08416,
            position: new THREE.Vector3(-13.898, 2.321, -4.212), rotation: new THREE.Vector3(0.0216, 3.5795, 0.0566),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/pocillopora_eydouxi.glb`, scale: 0.07502,
            position: new THREE.Vector3(-7.89, 2.286, 7.418), rotation: new THREE.Vector3(0.0924, Math.PI+2.5821, -0.0151),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/pocillopora_eydouxi.glb`, scale: 0.07391,
            position: new THREE.Vector3(9.6, 3.5, 1.5), rotation: new THREE.Vector3(0.12, Math.PI+3.7089, -0.12),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/pocillopora_eydouxi.glb`, scale: 0.09339,
            position: new THREE.Vector3(18.582, 2.3, -20.286), rotation: new THREE.Vector3(-Math.PI/8, Math.PI, Math.PI/8),
            canCollide: true },
        
            // fan_coral_med
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/fan_coral_med_materialfix.glb`, scale: 60.3296,
            position: new THREE.Vector3(26.275, 1, 10), rotation: new THREE.Vector3(0.0137, 3.5797, -0.12),
            canCollide: false },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/fan_coral_med_materialfix.glb`, scale: 40.33232,
            position: new THREE.Vector3(-26, 0.3, -24), rotation: new THREE.Vector3(-0.12, 3.4704, 0.12),
            canCollide: false },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/fan_coral_med_materialfix.glb`, scale: 50.25419,
            position: new THREE.Vector3(-9.178, 1.9, -16.87), rotation: new THREE.Vector3(0.0346, 0.2391, -0.0896),
            canCollide: false },
        
            // spined_sea_coral
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/spined_sea_coral.glb`, scale: 0.00352,
            position: new THREE.Vector3(7.834, 1.444, 18.324), rotation: new THREE.Vector3(-0.0098, 2.2331, 0.0784),
            canCollide: false },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/spined_sea_coral.glb`, scale: 0.00332,
            position: new THREE.Vector3(-0.232, 2.164, -19.218), rotation: new THREE.Vector3(0.0686, 4.8082, -0.0821),
            canCollide: false },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/spined_sea_coral.glb`, scale: 0.00383,
            position: new THREE.Vector3(-24.944, 1.012, -8.575), rotation: new THREE.Vector3(0.1147, 0.0325, 0.0583),
            canCollide: false },
        
            // crescent_moon_coral
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/crescent_moon_coral.glb`, scale: 5.05424,
            position: new THREE.Vector3(10.789, 2, -22.781), rotation: new THREE.Vector3(0.12, 0.1907, 0.12),
            canCollide: false },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/crescent_moon_coral.glb`, scale: 5.05945,
            position: new THREE.Vector3(24.512, 1.1, -20.912), rotation: new THREE.Vector3(0.0637, 2.6906, 0.12),
            canCollide: false },
        
            // lowpoly_coral
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/lowpoly_coral.glb`, scale: 0.79819,
            position: new THREE.Vector3(-12, 1.5, 5), rotation: new THREE.Vector3(0, 2.9388, 0.0248),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/lowpoly_coral.glb`, scale: 0.70701,
            position: new THREE.Vector3(6.3, 1.6, -30.681), rotation: new THREE.Vector3(0.12, 2.0242, -0.032),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/lowpoly_coral.glb`, scale: 0.58913,
            position: new THREE.Vector3(15, 0.1, 27), rotation: new THREE.Vector3(-0.12, 6.0768, -0.12),
            canCollide: true },
        
            // coral_piece
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/coral_piece.glb`, scale: 0.26789,
            position: new THREE.Vector3(7.009, 0.487, 30.131), rotation: new THREE.Vector3(-0.12, 1.2093, 0.12),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/coral_piece.glb`, scale: 0.27308,
            position: new THREE.Vector3(16.72, 1.712, -2.476), rotation: new THREE.Vector3(-0.079, 5.5547, 0.0959),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/coral_piece.glb`, scale: 0.35746,
            position: new THREE.Vector3(0.202, 1.59, 4.023), rotation: new THREE.Vector3(-0.0864, 0.1583, 0.0679),
            canCollide: true },
            { path: `${import.meta.env.BASE_URL}assets/scenery/corals/coral_piece.glb`, scale: 0.32381,
            position: new THREE.Vector3(-10.34, -0.136, 28.334), rotation: new THREE.Vector3(-0.12, 5.484, -0.0752),
            canCollide: true },
        ]);

        const kelpPath = `${import.meta.env.BASE_URL}assets/scenery/kelp_plant.glb`;
        const kelpTexture = `${import.meta.env.BASE_URL}textures/kelp.png`;
        this.kelps = new SceneryWrapper(
            this.scene,
            [
                // Group 1
                {
                    path: kelpPath,
                    scale: 0.2,
                    position: new THREE.Vector3(80, 0, -80),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.2,
                    position: new THREE.Vector3(80, 0, -90),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.1,
                    position: new THREE.Vector3(80, 0, -100),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.15,
                    position: new THREE.Vector3(80, 0, -115),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                // Group 2
                {
                    path: kelpPath,
                    scale: 0.2,
                    position: new THREE.Vector3(120, 0, 60),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                 {
                    path: kelpPath,
                    scale: 0.19,
                    position: new THREE.Vector3(80, 0, 55),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.15,
                    position: new THREE.Vector3(100, 0, 50),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.08,
                    position: new THREE.Vector3(110, 0, 45),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.2,
                    position: new THREE.Vector3(125, 0, 40),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.18,
                    position: new THREE.Vector3(134, 0, 35),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                // Group 3
                {
                    path: kelpPath,
                    scale: 0.16,
                    position: new THREE.Vector3(0, 0, 60),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                 {
                    path: kelpPath,
                    scale: 0.11,
                    position: new THREE.Vector3(-10, 0, 55),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.19,
                    position: new THREE.Vector3(-15, 0, 50),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.14,
                    position: new THREE.Vector3(-20, 0, 45),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.15,
                    position: new THREE.Vector3(-25, 0, 40),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
                {
                    path: kelpPath,
                    scale: 0.2,
                    position: new THREE.Vector3(-30, 0, 35),
                    rotation: new THREE.Vector3(0, -Math.PI/2, 0),
                    canCollide: false,
                    texturePath: kelpTexture,
                    textureRepeat: 1
                },
            ]
        );

        this.machinery = new Scenery(this.scene, `${import.meta.env.BASE_URL}assets/scenery/machinery.glb`, 16, new THREE.Vector3(-35,0,120), undefined, true);
        this.machinerybeam = new Beam({
            color: 0x4af9ff,
            intensity: 300,
            angle: Math.PI / 8,
            distance: 300,
            radius: 1,
            length: 300,
            opacity: 0.32,
            penumbra: 0.05,});
        this.machinerybeam.position.set(-35,2,120);
        this.machinerybeam.setDirection(new THREE.Vector3(0,1,0));
        this.machinerybeam.mesh.material.depthWrite = true;
        this.water.mesh.renderOrder = 1;
        this.scene.add(this.machinerybeam);

        // Creatures
        this.angelfishes = new CreatureWrapper(this.scene, EmperorAngelfish, 50, { center: new THREE.Vector3(0, 8, 0), radius: 10 }, 3, Math.PI);
        this.angelfishes2 = new CreatureWrapper(this.scene, EmperorAngelfish, 22, { center: new THREE.Vector3(-35,12,120), radius: 6 }, 3, Math.PI);
        this.angelfishes3 = new CreatureWrapper(this.scene, EmperorAngelfish, 12, { center: new THREE.Vector3(120, 12, 60), radius: 8 }, 3, Math.PI);
        this.coralfishes = new CreatureWrapper(this.scene, CoralFish, 40, { center: new THREE.Vector3(40, 8, 40), radius: 10 }, 0.00005, -Math.PI/2);
        this.coralfishes2 = new CreatureWrapper(this.scene, CoralFish, 16, { center: new THREE.Vector3(0, 8, -24), radius: 6 }, 0.00005, -Math.PI/2);
        this.coralfishes3 = new CreatureWrapper(this.scene, CoralFish, 80, { center: new THREE.Vector3(50, 12.8, -180), radius: 16 }, 0.00005, -Math.PI/2);
        this.whaleshark = new WhaleShark(this.scene, {scale:10, forwardOffset: Math.PI/2, canCollide: true});
        this.mantaray = new MantaRay(this.scene, {forwardOffset: Math.PI/2, swimSpeed: 1.7, canCollide: true});
        this.killerwhale = new KillerWhale(this.scene, {scale: 0.01, forwardOffset: Math.PI/2, canCollide: true});

        // Lighting setup
        this.scene.add(this.ambientLight);

        // World Frame
        if (this.#enableworldaxes) {
            const axesHelper = new THREE.AxesHelper(5);
            this.scene.add(axesHelper);
        }

        // Background sounds setup
        this.audioManager.load('underwater_ambience', `${import.meta.env.BASE_URL}sounds/underwater.mp3`, true, 0.5)
            .catch((error) => {
                console.error('Error loading background audio:', error);
            });
        
        this.audioManager.load('deep_ocean_dream', `${import.meta.env.BASE_URL}sounds/deep_ocean_dream.mp3`, false, 1)
            .catch((error) => {
                console.error('Error loading background audio:', error);
            });


    }

    enterWorld() {
        this.controls.enabled = true;
        this.scubadiver.playSplashSound();
        this.audioManager.play('underwater_ambience');
        this.scubadiver.playBreathingSound();

        setTimeout(() => this.audioManager.play('deep_ocean_dream'), 1200); // plays world music
    }

    start() {
        this.renderer.setAnimationLoop((time) => {
        this.render(time);
        });
    }

    render(timestamp) {
        this.timer.update(timestamp);
        Tweener.update(timestamp);
        const delta = this.timer.getDelta();
        const elapsed = this.timer.getElapsed();
        const dayDuration = 1200;
        const timeOfDay = ((elapsed+220) % dayDuration) / dayDuration;

        this.seabed.update(timestamp);
        this.water.update(timestamp);
        const daylightFactor = this.sun.update(timeOfDay);

        this.controls.update(delta);
        resolveEnvironmentCollisions(this.camera, this.seabed.mesh, this.water.waterLevel,  this.scubadiver.localOffset);
        this.scubadiver.update(delta);
        this.angelfishes.update(delta);
        this.angelfishes2.update(delta);
        this.angelfishes3.update(delta);
        this.coralfishes.update(delta);
        this.coralfishes2.update(delta);
        this.coralfishes3.update(delta);
        this.whaleshark.update(delta);
        this.mantaray.update(delta);
        this.killerwhale.update(delta);

        this.ambientLight.intensity = THREE.MathUtils.lerp(0.2, 1.0, daylightFactor);
        this.wreck.setLightLevel(daylightFactor); // fades the tuned emissive tint in with daylight
        this.currentClearColor.copy(this.nightClearColor).lerp(this.dayClearColor, daylightFactor);

        this.machinerybeam.setIntensity(daylightFactor < 0.2 ? 300 : 0);
        this.machinerybeam.setOpacity(daylightFactor < 0.2 ? 0.5 : 0);

        const brightClearColor = this.nightClearColor.clone().lerp(this.daySkyColor, daylightFactor);
        const surfaceThreshold = 20;
        let clearColorToUse = this.currentClearColor;
        let fogDensity = densityForVisibility(100); // underwater default

        if (this.camera.position.y > this.water.waterLevel) {
            clearColorToUse = brightClearColor;
            fogDensity = densityForVisibility(260);
        } else if (this.camera.position.y > this.water.waterLevel - surfaceThreshold) {
            const fadeFactor = (this.camera.position.y - (this.water.waterLevel - surfaceThreshold)) / surfaceThreshold;
            clearColorToUse = this.currentClearColor.clone().lerp(brightClearColor, fadeFactor);
            fogDensity = THREE.MathUtils.lerp(densityForVisibility(100), densityForVisibility(260), fadeFactor);
        }

        this.renderer.setClearColor(clearColorToUse);
        this.scene.fog.color.copy(clearColorToUse);
        this.scene.fog.density = fogDensity;

        this.renderer.render(this.scene, this.camera);
    }

    destroy() { // Correctly disposes the scene, avoiding memory leaks.
        this.renderer.setAnimationLoop(null);

        GarbageCollector.cleanUpScene(this.scene, this.renderer);
        
        if (this.renderer.domElement && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        console.log("World destroyed and WebGL memory cleared.");
    }
}

function densityForVisibility(distance) { // Utility function to convert a rough "visibility distance" value into a fog density value
    return 2.146 / distance;
}

function resolveEnvironmentCollisions(camera, seabedMesh, waterLevel, offset = new THREE.Vector3(0, 0, 0), seabedClearance = 1.2, waterClearance = 1.8) {
    const objectOffset = offset.clone().applyQuaternion(camera.quaternion);
    const objectWorldPos = camera.position.clone().add(objectOffset);
    const rayOrigin = objectWorldPos.clone();
    rayOrigin.y += 10;
    
    const raycaster = new THREE.Raycaster();
    raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

    const hits = raycaster.intersectObject(seabedMesh, true);
    if (hits.length > 0) {
        const seabedY = hits[0].point.y;
        const minObjectY = seabedY + seabedClearance;

        if (objectWorldPos.y < minObjectY) {
            camera.position.y += (minObjectY - objectWorldPos.y);
        }
    }

    const maxObjectY = waterLevel - waterClearance;
    if (objectWorldPos.y > maxObjectY) {
        camera.position.y -= (objectWorldPos.y - maxObjectY);
    }
}