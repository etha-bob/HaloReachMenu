(function () {
    'use strict';

    // =========================================================
    // AUDIO ENGINE
    // =========================================================

    class MenuAudio {
        constructor() {
            this.ctx = null;
            this.mainLoop = null;
            this.detailSound = null;
            this.mainGain = null;
            this.detailGain = null;
            this.detailTimer = null;
            this.started = false;
        }

        async init() {
            if (this.started) return;
            this.started = true;

            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes
            this.mainGain = this.ctx.createGain();
            this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
            this.mainGain.connect(this.ctx.destination);

            this.detailGain = this.ctx.createGain();
            this.detailGain.gain.setValueAtTime(CONFIG.audio.detailVolume, this.ctx.currentTime);
            this.detailGain.connect(this.ctx.destination);

            // Load and play main loop
            try {
                const loopBuffer = await this.loadAudio('sound/the_world_loop.ogg');
                this.mainLoop = this.ctx.createBufferSource();
                this.mainLoop.buffer = loopBuffer;
                this.mainLoop.loop = true;
                this.mainLoop.connect(this.mainGain);
                this.mainLoop.start(0);

                // Fade in over 1 second (from lsnd: Fade In Duration = 1.0)
                this.mainGain.gain.linearRampToValueAtTime(
                    CONFIG.audio.mainLoopVolume,
                    this.ctx.currentTime + CONFIG.audio.mainLoopFadeIn
                );
            } catch (e) {
                console.warn('Could not load main loop audio:', e);
            }

            // Load detail sound buffer
            try {
                this.detailBuffer = await this.loadAudio('sound/spooky6_details.ogg');
                this.scheduleDetailSound();
            } catch (e) {
                console.warn('Could not load detail audio:', e);
            }
        }

        async loadAudio(url) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return this.ctx.decodeAudioData(arrayBuffer);
        }

        scheduleDetailSound() {
            // Random interval between min and max (from lsnd detail: 10–25s)
            const min = CONFIG.audio.detailMinInterval;
            const max = CONFIG.audio.detailMaxInterval;
            const delay = min + Math.random() * (max - min);

            this.detailTimer = setTimeout(() => {
                this.playDetailSound();
                this.scheduleDetailSound(); // Schedule next
            }, delay * 1000);
        }

        playDetailSound() {
            if (!this.detailBuffer || !this.ctx) return;

            const source = this.ctx.createBufferSource();
            source.buffer = this.detailBuffer;

            // Random stereo panning (yaw -180 to 180 → pan -1 to 1)
            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(Math.random() * 2 - 1, this.ctx.currentTime);

            source.connect(panner);
            panner.connect(this.detailGain);
            source.start(0);
        }
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================

    document.addEventListener('DOMContentLoaded', () => {
        const audio = new MenuAudio();
        audio.init();
    });
})();
