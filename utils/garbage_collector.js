export class GarbageCollector {
    constructor() {
        throw Error("GarbageCollector is an abstract class and cannot be instantiated!");
    }
    
    static cleanUpScene(scene, renderer) { // Helper function to dispose all the meshes in a scene
        scene.traverse((object) => { 
            if (!object.isMesh) return;

            object.geometry.dispose();

            if (object.material.isMaterial) {
                GarbageCollector.cleanMaterial(object.material);
            } else {
                for (const material of object.material) {
                    GarbageCollector.cleanMaterial(material);
                }
            }
        });

        renderer.dispose(); // Dispose of the WebGL Renderer
    }

    static cleanMaterial(material) { // Helper function to dispose materials and their textures
        material.dispose();
        
        for (const key of Object.keys(material)) { // Dispose of any textures attached to the material
            const value = material[key];
            if (value && typeof value === 'object' && 'minFilter' in value) {
                value.dispose();
            }
        }
    }
}