import * as THREE from 'three';

export class TextureLoader {
    constructor() {
        throw new Error('TextureLoader is an abstract utility class and cannot be instantiated.');
    }

    static load_texture(path, repeatVal) {
        const textureLoader = new THREE.TextureLoader();
        const textureName = path.split(/[/\\]/).pop();
        const texture = textureLoader.load(
            path,
            (loadedTexture) => {
                console.log('Texture "' + textureName + '" loaded successfully!');
            },
            undefined,
            (error) => {
                console.error('An error happened loading the texture "' + textureName + '":', error);
            }
        );
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeatVal, repeatVal);

        return texture;
    }
}