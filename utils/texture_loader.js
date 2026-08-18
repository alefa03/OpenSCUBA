import * as THREE from 'three';

const COLOR_SPACE_BY_TYPE = {
    color: THREE.SRGBColorSpace,
    emissive: THREE.SRGBColorSpace,
    normal: THREE.NoColorSpace,
    specular: THREE.NoColorSpace,
    roughness: THREE.NoColorSpace,
    metalness: THREE.NoColorSpace,
    ao: THREE.NoColorSpace,
};

export class TextureLoader {
    constructor() {
        throw new Error('TextureLoader is an abstract utility class and cannot be instantiated.');
    }

    static load_texture(path, repeatVal, type = 'color', WrapS, wrapT) {
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

        texture.colorSpace = COLOR_SPACE_BY_TYPE[type] ?? THREE.NoColorSpace;
        texture.wrapS = WrapS ?? THREE.MirroredRepeatWrapping;
        texture.wrapT = wrapT ?? THREE.MirroredRepeatWrapping;
        texture.repeat.set(repeatVal, repeatVal);

        return texture;
    }
}