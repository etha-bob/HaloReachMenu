document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // PARALLAX CONFIGURATION
    // =========================================================
    // The Halo Reach menu camera has a very subtle slow drift.
    // Each layer moves at a different rate based on its depth.
    // Layers closer to the camera move more; distant layers
    // move less — standard parallax.
    //
    // These multipliers will need tuning once you see the
    // actual bitmaps. The ratios are derived from the relative
    // Y-positions in the BSP sub groups.
    // =========================================================

    const layers = [
        { id: 'layer-background', depthFactor: 0.02 },  // barely moves
        { id: 'layer-back-01',    depthFactor: 0.05 },
        { id: 'layer-back-02',    depthFactor: 0.08 },
        { id: 'layer-midground',  depthFactor: 0.15 },
        { id: 'layer-front',      depthFactor: 0.25 },  // moves most
    ];

    const layerElements = layers.map(l => ({
        el: document.getElementById(l.id),
        factor: l.depthFactor,
    }));

    // =========================================================
    // CAMERA DRIFT ANIMATION
    // =========================================================
    // The Reach title screen camera does a very slow horizontal
    // drift / sway. This is controlled by the scenario scripts
    // and camera animation tags. We simulate it with a sine wave.
    //
    // Period: ~20-30 seconds for a full cycle
    // Amplitude: very small (a few pixels of parallax shift)
    // =========================================================

    const DRIFT_PERIOD = 25000;    // ms for full cycle
    const DRIFT_AMPLITUDE = 15;    // max pixels of shift on front layer

    let startTime = performance.now();

    function animateParallax(timestamp) {
        const elapsed = timestamp - startTime;
        const phase = (elapsed % DRIFT_PERIOD) / DRIFT_PERIOD;
        const sineValue = Math.sin(phase * Math.PI * 2);

        layerElements.forEach(({ el, factor }) => {
            const offsetX = sineValue * DRIFT_AMPLITUDE * factor;
            // Slight vertical drift too (smaller amplitude)
            const offsetY = Math.cos(phase * Math.PI * 2) * 
                           (DRIFT_AMPLITUDE * 0.3) * factor;
            el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });

        requestAnimationFrame(animateParallax);
    }

    requestAnimationFrame(animateParallax);

    // =========================================================
    // AUDIO
    // =========================================================
    // The title screen has two audio layers:
    // 1. "the_world" - the main orchestral music loop
    // 2. ambient background (wind/environment)
    //
    // From the BSP sound palette:
    //   - Cutoff Distance: 2.0
    //   - Interpolation Speed: 2.0
    //   - Both play simultaneously
    //
    // Audio starts on first user interaction (browser policy).
    // =========================================================

    const bgMusic = document.getElementById('bg-music');
    const bgAmbience = document.getElementById('bg-ambience');

    // Set volumes (music is dominant, ambience is subtle)
    bgMusic.volume = 0.7;
    bgAmbience.volume = 0.3;

    function startAudio() {
        bgMusic.play().catch(() => {});
        bgAmbience.play().catch(() => {});
        document.removeEventListener('click', startAudio);
        document.removeEventListener('keydown', startAudio);
    }

    // Browsers require user interaction before playing audio
    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);

    // =========================================================
    // OPTIONAL: Shader-driven texture scrolling
    // =========================================================
    // Some layers may have UV scroll animation defined in the
    // rmsh shader. If when you extract the shader tags you find
    // scroll_speed_u or scroll_speed_v parameters, you can add
    // CSS animation to those specific layers:
    //
    // Example for a layer with horizontal texture scroll:
    //
    //   @keyframes texture-scroll {
    //       from { background-position-x: 0; }
    //       to { background-position-x: -100%; }
    //   }
    //
    //   #layer-some-scrolling-layer img {
    //       animation: texture-scroll 60s linear infinite;
    //   }
    //
    // The scroll speed from the shader tag will tell you the
    // duration. Typical Reach menu scroll speeds are very slow
    // (~0.01 to 0.05 units/second).
    // =========================================================
});
