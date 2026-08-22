export class CreatureWrapper { // Utility class to easily handle multiple creature instances of a specific class at once.
    constructor(scene, CreatureClass, count, bounds, scale, forwardOffset) {
        this.creatures = [];
        for (let i = 0; i < count; i++) {
            this.creatures.push(new CreatureClass(scene, {
                bounds,
                speed: 0.1 + Math.random() * 2, // little speed variety
                scale: scale,
                forwardOffset: forwardOffset
            }));
        }
    }
 
    update(deltaTime, camera) {
        for (const creature of this.creatures) {
            creature.update(deltaTime);

            if (creature.model && camera) { // Distance-based shadow culling
                const distance = creature.model.position.distanceTo(camera.position);
                const shouldCastShadow = distance < 12;
                
                if (creature.model.userData.isCastingShadow !== shouldCastShadow) {
                    creature.model.userData.isCastingShadow = shouldCastShadow;
                    
                    creature.model.traverse((child) => {
                        if (child.isMesh || child.isSkinnedMesh) {
                            child.castShadow = shouldCastShadow;
                        }
                    });
                }
            }
        }
    }
}