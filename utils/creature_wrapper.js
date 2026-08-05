
export class CreatureWrapper { // Utility class to easily handle multiple creature instances of a specific class at once.
    constructor(scene, CreatureClass, count, bounds, scale, forwardOffset) {
        this.creatures = [];
        for (let i = 0; i < count; i++) {
            this.creatures.push(new CreatureClass(scene, {
                bounds,
                speed: 0.1 + Math.random()*2, // little speed variety
                scale: scale,
                forwardOffset : forwardOffset
            }));
        }
    }
 
    update(deltaTime) {
        for (const creature of this.creatures) {
            creature.update(deltaTime);
        }
    }
}