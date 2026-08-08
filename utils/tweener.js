import * as TWEEN from '@tweenjs/tween.js';

export class Tweener { // Utility class to handily perform tweening with Tween.js
    static Easing = TWEEN.Easing; // re-exposed so callers don't need their own TWEEN import

    constructor() {
        throw new Error('Tweener is an abstract utility class and cannot be instantiated.');
    }

    static tween(target, to, duration = 1000, easing = TWEEN.Easing.Linear.None, onUpdate = null) {
        const tween = new TWEEN.Tween(target)
            .to(to, duration)
            .easing(easing);

        if (onUpdate) {
            tween.onUpdate(onUpdate);
        }

        tween.start();
        return tween;
    }

    static update(time = performance.now()) {
        return TWEEN.update(time);
    }
}