export class TimeDisplay {
    constructor(options = {}) {
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.bottom = `${options.margin ?? 12}px`;
        this.element.style.right = `${options.margin ?? 12}px`;
        this.element.style.color = 'white';
        this.element.style.fontFamily = 'monospace';
        this.element.style.fontSize = '24px';
        this.element.style.fontWeight = 'bold';
        //this.element.style.textShadow = '0 0 4px rgba(0, 0, 0, 0.8)';
        this.element.style.zIndex = '9';
        this.element.innerText = "00:00";
        document.body.appendChild(this.element);
    }

    update(timeOfDay) {
        const clockTimeOfDay = (timeOfDay + 0.25) % 1.0;
        const totalMinutes = clockTimeOfDay * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        this.element.innerText = `${formattedHours}:${formattedMinutes}`;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}