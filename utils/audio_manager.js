import * as THREE from 'three';

export class AudioManager {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    this.audioLoader = new THREE.AudioLoader();
    this.sounds = new Map();
    this.isUnlocked = false;

    const unlockAudio = () => { // Automatically unlock audio on the very first user interaction anywhere
      if (this.listener.context.state === 'suspended') {
        this.listener.context.resume();
      }
      this.isUnlocked = true;

      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
  }

  load(name, url, loop = false, volume = 0.5, isPositional = false, meshTarget = null) { // Load a sound into memory
    return new Promise((resolve, reject) => {
      this.audioLoader.load(url, (buffer) => {
        let sound;

        if (isPositional && meshTarget) {
          sound = new THREE.PositionalAudio(this.listener);
          sound.setRefDistance(10);
          meshTarget.add(sound); // Attach 3D sound to a physical mesh
        } else {
          sound = new THREE.Audio(this.listener);
        }

        sound.setBuffer(buffer);
        sound.setLoop(loop);
        sound.setVolume(volume);

        this.sounds.set(name, sound);
        resolve(sound);
      }, undefined, (error) => {
        console.error(`Failed to load audio: ${name}`, error);
        reject(error);
      });
    });
  }

  play(name) { // Play a sound by its registered key
    const sound = this.sounds.get(name);
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }

  stop(name) { // Stop a sound by its registered key
    const sound = this.sounds.get(name);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }
}