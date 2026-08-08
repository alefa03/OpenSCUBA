import * as THREE from 'three';

const UI_CLICK_SOUND = 'ui_click';
const CLICK_DELAY_MS = 800;     // pause after clicking the 'play' button
const CONTENT_FADE_MS = 1000;   // UI content fade-out time
const BLACK_HOLD_MS = 400;      // hold time on solid black background
const WORLD_FADE_MS = 1000;     // black background fade-away time
const READY_DEBOUNCE_MS = 300;  // loading time tolerance (avoids 'loading done' false positives)
const LOAD_FALLBACK_MS = 45000; // max loading time (avoids endless loading)

function once(fn) {
    let called = false;
    return (...args) => {
        if (called) return;
        called = true;
        fn(...args);
    };
}

export class LoadingUI {
    constructor(world) {
        this.world = world;

        this.overlay = document.getElementById('ui-overlay');
        this.content = document.getElementById('ui-content');
        this.loadingLabel = document.getElementById('ui-loading-label');
        this.progressContainer = document.getElementById('ui-progress-container');
        this.progressBar = document.getElementById('ui-progress-bar');
        this.progressText = document.getElementById('ui-progress-text');
        this.playButton = document.getElementById('ui-play-button');

        this._maxPercent = 0;
        this._ready = false;
        this._started = false;

        this._preloadUiSounds();
        this._trackLoading();

        this.playButton.addEventListener('click', () => this._handlePlay(), { once: true });
    }

    _preloadUiSounds() {
        this.world.audioManager
            .load(UI_CLICK_SOUND, '../sounds/ui_click.mp3', false, 0.8)
            .catch((error) => console.error('Error loading UI click sound:', error));
    }

    _describeAsset(url) { // Returns which element is currently being loaded
        if (!url) return 'Loading assets…';
        const filename = decodeURIComponent(url.split('/').pop().split('?')[0]);
        return `Loading assets…\n${filename}`;
    }

    _trackLoading() {
        const manager = THREE.DefaultLoadingManager;

        manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const percent = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 100;
            this._maxPercent = Math.max(this._maxPercent, percent); // never let the bar visibly backtrack
            this.progressBar.style.width = `${this._maxPercent}%`;
            this.progressText.textContent = `${Math.round(this._maxPercent)}%`;
            this.loadingLabel.textContent = "Loading assets..." //this._describeAsset(url);
            this._scheduleReadyCheck();
        };


        manager.onLoad = () => this._scheduleReadyCheck();

        manager.onError = (url) => console.error(`Asset failed to load: ${url}`);

        if (manager.itemsTotal > 0 && manager.itemsLoaded >= manager.itemsTotal) { // covers the edge case in which everything had already finished loading
            this._scheduleReadyCheck();
        }

        this._fallbackTimer = setTimeout(() => { // avoids Play to get stuck disabled forever.
            if (!this._ready) {
                console.warn('LoadingUI: loading manager never settled, enabling Play anyway.');
                this._setReady();
            }
        }, LOAD_FALLBACK_MS);
    }

    _scheduleReadyCheck() { // waits for a short quiet period with no further progress before confirming the 'loading done' state
        clearTimeout(this._readyCheckTimer);
        this._readyCheckTimer = setTimeout(() => {
            const manager = THREE.DefaultLoadingManager;
            if (manager.itemsLoaded >= manager.itemsTotal) {
                this._setReady();
            }
        }, READY_DEBOUNCE_MS);
    }

    _setReady() {
        if (this._ready) return; // prevents the Play button to flicker/re-enable
        this._ready = true;
        clearTimeout(this._fallbackTimer);
        clearTimeout(this._readyCheckTimer);
        this._maxPercent = 100;
        this.progressBar.style.width = '100%';
        this.progressText.textContent = '100%';
        this.progressContainer.classList.add('ui-hidden'); // progress bar fade-out
        this.progressText.classList.add('ui-hidden');
        this.loadingLabel.classList.add('ui-hidden');
        this.playButton.disabled = false;
        this.playButton.classList.add('ui-ready'); // button fade-in
    }

    _handlePlay() { // triggers when the play button is clicked
        if (this._started) return;
        this._started = true;

        this.playButton.disabled = true;
        this.playButton.textContent = "Let's dive!";
        clearTimeout(this._fallbackTimer);
        clearTimeout(this._readyCheckTimer);

        const ctx = this.world.audioManager.listener.context;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        this.world.audioManager.play(UI_CLICK_SOUND);

        setTimeout(() => {this._fadeContentOut(); this.world.enterWorld();}, CLICK_DELAY_MS); // triggers world entering after a specified delay
    }

    _fadeContentOut() { // fades the loading UI elements (logo, progress bar, button) away
        this.content.classList.add('ui-hidden');
        const proceed = once(() => this._holdBlack());
        this.content.addEventListener('transitionend', proceed, { once: true });
        setTimeout(proceed, CONTENT_FADE_MS + 100);
    }

    _holdBlack() {
        setTimeout(() => this._fadeToWorld(), BLACK_HOLD_MS);
    }

    _fadeToWorld() { // fades the black background away, revealing the 3D world underneath.
        this.overlay.classList.add('ui-hidden');
        const proceed = once(() => { this.overlay.style.display = 'none'; });
        this.overlay.addEventListener('transitionend', proceed, { once: true });
        setTimeout(proceed, WORLD_FADE_MS + 100);
    }
}