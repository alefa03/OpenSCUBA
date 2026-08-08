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
        
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.repeat.set(repeatVal, repeatVal);

        return texture;
    }
}