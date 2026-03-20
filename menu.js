(function () {
    'use strict';

    // =========================================================
    // CONFIGURATION — derived from tag data
    // =========================================================

    const CONFIG = {
        // Parallax camera drift
        drift: {
            periodMs: 25000,        // Full sway cycle
            amplitudePx: 12,        // Max pixel shift on closest layer
            verticalRatio: 0.3,     // Vertical drift is 30% of horizontal
        },

        // Parallax depth factors per layer (back to front).
        // Derived from relative Y-distances in the BSP sub groups.
        // Background barely moves; front moves most.
        layers: [
            { id: 'layer-background', depthFactor: 0.02 },
            { id: 'layer-back-01',    depthFactor: 0.06 },
            { id: 'layer-back-02',    depthFactor: 0.10 },
            { id: 'layer-midground',  depthFactor: 0.18 },
            // layer-front is animated via pure CSS keyframes
        ],

        // Audio — from lsnd tag
        audio: {
            // Main loop: gain = -9 dB → linear ≈ 0.354
            // (we'll use a slightly higher value since web audio
            //  doesn't have the same reference level as the engine)
            mainLoopVolume: 0.35,
            mainLoopFadeIn: 1.0,      // seconds

            // Detail sound: spooky6_details
            // Plays randomly every 10–25 seconds at -9 dB
            detailVolume: 0.35,
            detailMinInterval: 10,     // seconds
            detailMaxInterval: 25,     // seconds
        },
    };

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
    // PARALLAX ENGINE
    // =========================================================

    class ParallaxEngine {
        constructor() {
            this.layerElements = CONFIG.layers.map(l => ({
                el: document.getElementById(l.id),
                factor: l.depthFactor,
            }));
            this.startTime = performance.now();
            this.running = false;
        }

        start() {
            this.running = true;
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        animate(timestamp) {
            if (!this.running) return;

            const elapsed = timestamp - this.startTime;
            const phase = (elapsed % CONFIG.drift.periodMs) / CONFIG.drift.periodMs;
            const angle = phase * Math.PI * 2;

            const sineX = Math.sin(angle);
            const cosY = Math.cos(angle * 0.7); // Slightly different frequency for Y

            this.layerElements.forEach(({ el, factor }) => {
                if (!el) return;
                const offsetX = sineX * CONFIG.drift.amplitudePx * factor;
                const offsetY = cosY * CONFIG.drift.amplitudePx * CONFIG.drift.verticalRatio * factor;
                el.style.transform = `translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, 0)`;
            });

            requestAnimationFrame(this.animate);
        }
    }

    // =========================================================
    // INITIALIZATION
    // =========================================================

    document.addEventListener('DOMContentLoaded', () => {
        const parallax = new ParallaxEngine();
        const audio = new MenuAudio();

        // Start parallax immediately (no user interaction needed)
        parallax.start();

        // Start audio on user interaction (browser autoplay policy)
        const overlay = document.getElementById('start-overlay');
        overlay.addEventListener('click', () => {
            audio.init();
            overlay.classList.add('hidden');
            // Remove overlay from DOM after fade
            setTimeout(() => overlay.remove(), 1500);
        });
    });
})();
