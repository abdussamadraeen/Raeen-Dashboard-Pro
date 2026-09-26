import { getHardwareCapabilities } from '../../../lib/hardwareMonitor';
/**
 * Ultra-HD / 3D Artistic Interactive Canvas Engine
 * Features:
 * - Retina / High-DPI DPR auto-scaling (Crystal crisp on 4K & Retina displays)
 * - Multi-layer 3D perspective depth, volumetric illumination, and particle physics
 * - 10 High-end interactive themes:
 *   1. Neural Network (High-visibility electric cyan/azure synaptic depth with traveling action potential pulses)
 *   2. Water Bubbles (3D iridescent glass orbs with specular crescent reflections)
 *   3. Frosted Glass Rain (Atmospheric condensation droplets, mist haze, frosted glass blur, and ground splash ripples)
 *   4. Matrix Code Stream (Multi-depth phosphor Katakana/hex rain with EMP shockwaves)
 *   5. Hyperspace Warp (3D starfield with dynamic cockpit steering & hyper-boost trails)
 *   6. Aurora Wave Flow (Luminous liquid ribbons with fluid mouse ripples & screen blending)
 *   7. Gravitational Galaxy (Dual-arm spiral galaxy with relativistic mouse vortex singularity)
 *   8. Bioluminescent Fireflies (Bokeh forest depth, stardust trails, and magnetic swarm physics)
 *   9. Retro Synthwave Wireframe (3D undulating neon terrain, horizon sun, wireframe peaks & mouse elevation warp)
 *   10. Quantum Flow Field (Multi-curl vector stream fibers, chromatic dispersion & cursor vortex steering)
 */

const MATRIX_GLYPHS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜXYZ@#$&*§ΔΩΨ';

const TARGET_FPS = 60;
const FRAME_MIN_MS = 1000 / TARGET_FPS - 1.5; // ~15.1ms

export const CanvasEngine = (() => {
    let canvas = null;
    let ctx = null;
    let animationId = null;
    let resizeId = null;
    let accentObserver = null;
    let particles = [];
    let secondaryParticles = []; // For splashes, pulses, stardust trails
    let extraState = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let theme = 'neural';
    let speedMult = 1.0;
    let densityMult = 1.0;
    let glowMult = 1.0;
    let isRunning = false;
    let accent = '#38bdf8';
    let accentRgb = '56, 189, 248';
    let globalTime = 0;
    let lastFrameTimestamp = 0;

    // Offscreen Canvas Caches for maximum fill-rate performance
    let glowSpriteCanvas = null;
    let offscreenBgCanvas = null;

    const mouse = {
        x: null,
        y: null,
        prevX: null,
        prevY: null,
        vx: 0,
        vy: 0,
        speed: 0,
        isDown: false
    };

    const updateGlowSprite = () => {
        if (!glowSpriteCanvas) glowSpriteCanvas = document.createElement('canvas');
        glowSpriteCanvas.width = 64;
        glowSpriteCanvas.height = 64;
        const sCtx = glowSpriteCanvas.getContext('2d');
        if (!sCtx) return;
        sCtx.clearRect(0, 0, 64, 64);

        const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, `rgba(${accentRgb}, 1.0)`);
        grad.addColorStop(0.35, `rgba(${accentRgb}, 0.5)`);
        grad.addColorStop(0.7, `rgba(${accentRgb}, 0.12)`);
        grad.addColorStop(1, 'transparent');

        sCtx.fillStyle = grad;
        sCtx.beginPath();
        sCtx.arc(32, 32, 32, 0, Math.PI * 2);
        sCtx.fill();
    };

    const renderStaticRainMist = () => {
        if (!width || !height || !canvas) return;
        if (!offscreenBgCanvas) offscreenBgCanvas = document.createElement('canvas');
        offscreenBgCanvas.width = canvas.width;
        offscreenBgCanvas.height = canvas.height;
        const oCtx = offscreenBgCanvas.getContext('2d');
        if (!oCtx) return;

        oCtx.setTransform(1, 0, 0, 1, 0, 0);
        oCtx.scale(dpr, dpr);
        oCtx.clearRect(0, 0, width, height);

        const mistGrad = oCtx.createLinearGradient(0, 0, 0, height);
        mistGrad.addColorStop(0, 'rgba(10, 16, 30, 0.38)');
        mistGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.45)');
        mistGrad.addColorStop(1, 'rgba(8, 12, 22, 0.58)');
        oCtx.fillStyle = mistGrad;
        oCtx.fillRect(0, 0, width, height);

        for (const drop of secondaryParticles) {
            oCtx.beginPath();
            oCtx.ellipse(drop.x, drop.y, drop.r, drop.r * drop.aspect, 0, 0, Math.PI * 2);
            oCtx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.75})`;
            oCtx.fill();

            oCtx.beginPath();
            oCtx.arc(drop.x - drop.r * 0.35, drop.y - drop.r * 0.35 * drop.aspect, Math.max(0.6, drop.r * 0.3), 0, Math.PI * 2);
            oCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            oCtx.fill();

            oCtx.beginPath();
            oCtx.arc(drop.x + drop.r * 0.2, drop.y + drop.r * 0.4 * drop.aspect, drop.r * 0.5, 0, Math.PI * 2);
            oCtx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            oCtx.fill();
        }
    };

    const renderStaticSynthwaveSky = () => {
        if (!width || !height || !canvas) return;
        if (!offscreenBgCanvas) offscreenBgCanvas = document.createElement('canvas');
        offscreenBgCanvas.width = canvas.width;
        offscreenBgCanvas.height = canvas.height;
        const oCtx = offscreenBgCanvas.getContext('2d');
        if (!oCtx) return;

        oCtx.setTransform(1, 0, 0, 1, 0, 0);
        oCtx.scale(dpr, dpr);
        oCtx.clearRect(0, 0, width, height);

        const horizonY = height * 0.48;
        const sunRadius = Math.min(width, height) * 0.18;
        const sunX = width / 2;
        const sunY = horizonY - sunRadius * 0.35;

        const skyGrad = oCtx.createLinearGradient(0, 0, 0, horizonY);
        skyGrad.addColorStop(0, '#0a0518');
        skyGrad.addColorStop(0.7, '#1b0e36');
        skyGrad.addColorStop(1, '#3b1259');
        oCtx.fillStyle = skyGrad;
        oCtx.fillRect(0, 0, width, horizonY);

        const sunGrad = oCtx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.4, '#f43f5e');
        sunGrad.addColorStop(1, '#c026d3');
        oCtx.beginPath();
        oCtx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        oCtx.fillStyle = sunGrad;
        oCtx.fill();

        const blindCount = 8;
        for (let b = 0; b < blindCount; b++) {
            const by = sunY + (b / blindCount) * sunRadius * 0.95;
            const bHeight = 2 + b * 1.4;
            oCtx.fillStyle = '#0f0821';
            oCtx.fillRect(sunX - sunRadius - 10, by, sunRadius * 2 + 20, bHeight);
        }

        const floorGrad = oCtx.createLinearGradient(0, horizonY, 0, height);
        floorGrad.addColorStop(0, '#0d061f');
        floorGrad.addColorStop(1, '#05020c');
        oCtx.fillStyle = floorGrad;
        oCtx.fillRect(0, horizonY, width, height - horizonY);
    };

    const updateAccent = () => {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue('--accent')
            .trim();

        accent = value || '#38bdf8';
        const hex = accent.replace('#', '');
        const normalized = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex;

        if (/^[0-9a-f]{6}$/i.test(normalized)) {
            accentRgb = `${parseInt(normalized.slice(0, 2), 16)}, ${parseInt(normalized.slice(2, 4), 16)}, ${parseInt(normalized.slice(4, 6), 16)}`;
        } else {
            accentRgb = '56, 189, 248';
        }

        updateGlowSprite();
        if (theme === 'rain') renderStaticRainMist();
        if (theme === 'synthwave') renderStaticSynthwaveSky();
    };

    // ─── Particle & Architecture Generator ───
    const createParticles = () => {
        if (!width || !height) return;
        particles = [];
        secondaryParticles = [];
        extraState = null;

        const caps = getHardwareCapabilities();
        const effectiveDensity = caps.throttleAnimations ? densityMult * 0.33 : densityMult;

        if (theme === 'neural') {
            // 55 particles provides rich synaptic depth with 85% fewer distance computations
            const count = Math.max(25, Math.floor(55 * effectiveDensity));
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.75 + 0.25;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: (Math.random() - 0.5) * 1.2 * z,
                    vy: (Math.random() - 0.5) * 1.2 * z,
                    radius: (Math.random() * 2.5 + 2.0) * z,
                    opacity: (Math.random() * 0.35 + 0.65) * z,
                    pulsePhase: Math.random() * Math.PI * 2
                };
            });
            secondaryParticles = [];
        } else if (theme === 'bubbles') {
            const count = Math.max(15, Math.floor(28 * effectiveDensity));
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.7 + 0.3;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: (Math.random() - 0.5) * 0.5 * z,
                    vy: (Math.random() * 1.2 + 0.6) * z,
                    radius: (Math.random() * 20 + 8) * z,
                    wobbleSpeed: Math.random() * 0.04 + 0.02,
                    wobbleAmp: Math.random() * 2 + 1,
                    wobblePhase: Math.random() * Math.PI * 2,
                    opacity: Math.random() * 0.35 + 0.35
                };
            });
        } else if (theme === 'rain') {
            const count = Math.max(25, Math.floor(65 * effectiveDensity));
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.8 + 0.2;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: (Math.random() * 0.4 - 0.2) * z,
                    vy: (Math.random() * 9 + 11) * z,
                    length: (Math.random() * 24 + 16) * z,
                    thickness: (Math.random() * 1.8 + 1.0) * z,
                    opacity: (Math.random() * 0.4 + 0.5) * z
                };
            });

            // Static condensation droplets pre-rendered onto offscreen canvas
            const mistDropsCount = Math.max(25, Math.floor(65 * effectiveDensity));
            secondaryParticles = Array.from({ length: mistDropsCount }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                r: Math.random() * 3.5 + 1.2,
                opacity: Math.random() * 0.3 + 0.15,
                aspect: Math.random() * 0.4 + 0.8
            }));

            renderStaticRainMist();

            extraState = {
                splashes: []
            };
        } else if (theme === 'matrix') {
            const cols = Math.floor(width / 24);
            particles = Array.from({ length: cols }, (_, i) => {
                const isForeground = Math.random() > 0.4;
                const fontSize = isForeground ? 15 : 11;
                return {
                    x: i * 24,
                    y: Math.random() * -height,
                    speed: (Math.random() * 2.5 + 2.0) * (isForeground ? 1.0 : 0.6),
                    length: Math.floor(Math.random() * 14 + 10),
                    chars: Array.from({ length: 22 }, () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)]),
                    fontSize,
                    isForeground,
                    highlight: 0
                };
            });
        } else if (theme === 'warp') {
            const count = Math.max(60, Math.floor(160 * effectiveDensity));
            particles = Array.from({ length: count }, () => ({
                x: (Math.random() - 0.5) * width * 2.2,
                y: (Math.random() - 0.5) * height * 2.2,
                z: Math.random() * width,
                pz: 0,
                colorType: Math.random()
            }));
            extraState = {
                centerX: width / 2,
                centerY: height / 2,
                targetCenterX: width / 2,
                targetCenterY: height / 2
            };
        } else if (theme === 'wave') {
            extraState = {
                waves: [
                    { amp: 65, freq: 0.0022, speed: 0.016, color: `rgba(${accentRgb}, 0.24)`, stroke: accent },
                    { amp: 48, freq: 0.0036, speed: -0.014, color: 'rgba(56, 189, 248, 0.18)', stroke: '#38bdf8' },
                    { amp: 75, freq: 0.0018, speed: 0.022, color: 'rgba(168, 85, 247, 0.16)', stroke: '#c084fc' }
                ]
            };
        } else if (theme === 'galaxy') {
            const count = Math.max(50, Math.floor(130 * effectiveDensity));
            const maxR = Math.min(width, height) * 0.48;
            particles = Array.from({ length: count }, () => {
                const dist = Math.pow(Math.random(), 1.5) * maxR + 8;
                const arm = Math.random() < 0.5 ? 0 : Math.PI;
                const angle = dist * 0.012 + arm + (Math.random() - 0.5) * 0.42;
                const isCore = dist < maxR * 0.18;
                return {
                    dist,
                    angle,
                    speed: (0.005 + 10 / (dist + 35)),
                    radius: isCore ? (Math.random() * 2.4 + 1.2) : (Math.random() * 1.6 + 0.7),
                    alpha: Math.random() * 0.5 + 0.4,
                    isCore
                };
            });
        } else if (theme === 'fireflies') {
            const count = Math.max(15, Math.floor(32 * effectiveDensity));
            particles = Array.from({ length: count }, () => {
                const isBokeh = Math.random() < 0.25;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.7,
                    radius: isBokeh ? (Math.random() * 12 + 7) : (Math.random() * 2.6 + 1.4),
                    isBokeh,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.035 + 0.015,
                    isAccent: Math.random() > 0.4
                };
            });
            secondaryParticles = [];
        } else if (theme === 'synthwave') {
            extraState = {
                gridOffset: 0
            };
            renderStaticSynthwaveSky();
        } else if (theme === 'quantum') {
            const count = Math.max(25, Math.floor(70 * effectiveDensity));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: 0,
                vy: 0,
                speed: Math.random() * 1.5 + 1.5,
                history: [],
                maxHistory: 8,
                colorOffset: Math.random() * 60 - 30,
                energy: Math.random() * 0.5 + 0.5
            }));
        }
    };

    // ─── High-DPI Smart Clamped Resize ───
    const resize = () => {
        resizeId = null;
        if (!canvas || !ctx) return;

        // Clamp DPR to 1.25 max to preserve 60 FPS on 1440p / 4K / scaled displays
        dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.25));
        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        createParticles();
    };

    let resizeTimer = null;
    const scheduleResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (resizeId !== null) return;
            resizeId = requestAnimationFrame(resize);
        }, 150);
    };

    const handlePointerMove = (event) => {
        if (mouse.x !== null) {
            mouse.vx = event.clientX - mouse.x;
            mouse.vy = event.clientY - mouse.y;
            mouse.speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
        }
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    };

    const handlePointerDown = () => {
        mouse.isDown = true;
    };

    const handlePointerUp = () => {
        mouse.isDown = false;
    };

    const clearPointer = () => {
        mouse.x = null;
        mouse.y = null;
        mouse.prevX = null;
        mouse.prevY = null;
        mouse.vx = 0;
        mouse.vy = 0;
        mouse.speed = 0;
        mouse.isDown = false;
    };

    // ─────────────────────────────────────────────────────────────
    // 1. NEURAL NETWORK: 3D Synaptic Action Potential Brain
    // ─────────────────────────────────────────────────────────────
    const renderNeural = () => {
        const glowFactor = glowMult;

        // Periodic traveling pulse (max 4 concurrent)
        if (Math.random() < 0.08 && secondaryParticles.length < 4 && particles.length > 2) {
            const i1 = Math.floor(Math.random() * particles.length);
            const p1 = particles[i1];
            for (let i2 = 0; i2 < particles.length; i2++) {
                if (i1 === i2) continue;
                const p2 = particles[i2];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                if (Math.abs(dx) < 150 && Math.abs(dy) < 150 && dx * dx + dy * dy < 150 ** 2) {
                    secondaryParticles.push({
                        fromX: p1.x, fromY: p1.y,
                        toX: p2.x, toY: p2.y,
                        progress: 0,
                        speed: Math.random() * 0.04 + 0.025
                    });
                    break;
                }
            }
        }

        const connDist = 160;
        const connDistSq = connDist * connDist;

        // 1. Update particle positions
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            p1.x += p1.vx * speedMult;
            p1.y += p1.vy * speedMult;

            // Soft damping & speed limiting for natural organic physics
            p1.vx *= 0.99;
            p1.vy *= 0.99;
            const maxSpeed = 3.0 * (p1.z || 1);
            const speedSq = p1.vx * p1.vx + p1.vy * p1.vy;
            if (speedSq > maxSpeed * maxSpeed) {
                const s = Math.sqrt(speedSq);
                p1.vx = (p1.vx / s) * maxSpeed;
                p1.vy = (p1.vy / s) * maxSpeed;
            }

            if (p1.x < 0) { p1.x = 0; p1.vx = Math.abs(p1.vx); }
            else if (p1.x > width) { p1.x = width; p1.vx = -Math.abs(p1.vx); }
            if (p1.y < 0) { p1.y = 0; p1.vy = Math.abs(p1.vy); }
            else if (p1.y > height) { p1.y = height; p1.vy = -Math.abs(p1.vy); }

            if (mouse.x !== null) {
                const dx = mouse.x - p1.x;
                const dy = mouse.y - p1.y;
                if (Math.abs(dx) < 220 && Math.abs(dy) < 220) {
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 220 ** 2) {
                        const dist = Math.sqrt(distSq) || 1;
                        const force = (220 - dist) / 220;
                        p1.vx += (dx / dist) * force * 0.28;
                        p1.vy += (dy / dist) * force * 0.28;
                    }
                }
            }
        }

        // 2. Batched Synaptic Connection Lines (Single stroke draw call)
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                if (dx > connDist || dx < -connDist) continue;
                const dy = p1.y - p2.y;
                if (dy > connDist || dy < -connDist) continue;

                const dSq = dx * dx + dy * dy;
                if (dSq < connDistSq) {
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                }
            }
        }
        ctx.strokeStyle = `rgba(${accentRgb}, ${0.35 * glowFactor})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 3. Batched Cursor Synapse Stimulus
        if (mouse.x !== null) {
            ctx.beginPath();
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                if (Math.abs(dx) < 180 && Math.abs(dy) < 180 && dx * dx + dy * dy < 180 ** 2) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(mouse.x, mouse.y);
                }
            }
            ctx.strokeStyle = `rgba(${accentRgb}, ${0.65 * glowFactor})`;
            ctx.lineWidth = 1.4;
            ctx.stroke();
        }

        // 4. Draw Radial Aura Glows using Cached Offscreen Texture
        if (glowSpriteCanvas) {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                p.pulsePhase += 0.035 * speedMult;
                const r = p.radius * (1 + 0.18 * Math.sin(p.pulsePhase));
                const auraSize = r * 5.2;
                ctx.globalAlpha = Math.min(1.0, p.opacity * 0.9 * glowFactor);
                ctx.drawImage(glowSpriteCanvas, p.x - auraSize * 0.5, p.y - auraSize * 0.5, auraSize, auraSize);
            }
        }

        // 5. Batched Node Bodies
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const r = p.radius;
            ctx.moveTo(p.x + r, p.y);
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        }
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.95;
        ctx.fill();

        // 6. Batched Crisp White Center Embers
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const cr = Math.max(1.1, p.radius * 0.45);
            ctx.moveTo(p.x + cr, p.y);
            ctx.arc(p.x, p.y, cr, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 1.0;
        ctx.fill();

        // 7. Batched Action Potential Pulses
        if (secondaryParticles.length > 0) {
            ctx.beginPath();
            for (let idx = secondaryParticles.length - 1; idx >= 0; idx--) {
                const pulse = secondaryParticles[idx];
                pulse.progress += pulse.speed * speedMult;
                if (pulse.progress >= 1) {
                    secondaryParticles.splice(idx, 1);
                    continue;
                }
                const px = pulse.fromX + (pulse.toX - pulse.fromX) * pulse.progress;
                const py = pulse.fromY + (pulse.toY - pulse.fromY) * pulse.progress;
                ctx.moveTo(px + 2.5, py);
                ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    };

    // ─────────────────────────────────────────────────────────────
    // 2. WATER BUBBLES: 3D Iridescent Soap / Glass Orbs
    // ─────────────────────────────────────────────────────────────
    const renderBubbles = () => {
        for (const p of particles) {
            p.y -= p.vy;
            p.wobblePhase += p.wobbleSpeed;
            p.x += Math.sin(p.wobblePhase) * p.wobbleAmp * 0.25;

            if (p.y < -p.radius * 2) {
                p.y = height + p.radius * 2;
                p.x = Math.random() * width;
            }

            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                if (Math.abs(dx) < 140 && Math.abs(dy) < 140) {
                    const distSq = dx * dx + dy * dy;
                    const repelDist = p.radius + 100;
                    if (distSq < repelDist * repelDist) {
                        const dist = Math.sqrt(distSq) || 1;
                        const force = (repelDist - dist) / repelDist;
                        p.x -= (dx / dist) * force * 4.5;
                        p.y -= (dy / dist) * force * 4.5;
                    }
                }
            }

            const r = p.radius;
            // Bubble body
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${accentRgb}, ${p.opacity * 0.12})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
            ctx.lineWidth = 1.2 * p.z;
            ctx.stroke();

            // Specular crescent
            ctx.beginPath();
            ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.35, Math.PI * 0.9, Math.PI * 1.8);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.8})`;
            ctx.lineWidth = 1.5 * p.z;
            ctx.stroke();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 3. FROSTED GLASS RAIN: Cached Mist & Batched Rain Streaks
    // ─────────────────────────────────────────────────────────────
    const renderRain = () => {
        const glowFactor = glowMult;

        // 1. Draw pre-rendered static condensation & mist in 1 GPU texture blit (0.01ms)
        if (offscreenBgCanvas) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(offscreenBgCanvas, 0, 0);
            ctx.restore();
        }

        // 2. Update rain streaks with mouse wiper interaction
        for (const p of particles) {
            p.x += p.vx * speedMult;
            p.y += p.vy * speedMult;

            if (p.y > height) {
                if (extraState?.splashes && Math.random() < 0.35 && extraState.splashes.length < 12) {
                    extraState.splashes.push({
                        x: p.x,
                        y: height - Math.random() * 5,
                        r: 2,
                        alpha: 0.75,
                        speed: Math.random() * 0.9 + 0.6
                    });
                }
                p.y = -p.length - 20;
                p.x = Math.random() * width;
            }

            // Mouse wiper physics
            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                if (Math.abs(dx) < 130 && Math.abs(dy) < 130) {
                    const distSq = dx * dx + dy * dy;
                    const wipeRadius = 130;
                    if (distSq < wipeRadius * wipeRadius) {
                        const dist = Math.sqrt(distSq) || 1;
                        const force = (wipeRadius - dist) / wipeRadius;
                        p.x -= (dx / dist) * force * 5.0;
                        p.vx += (dx > 0 ? -1 : 1) * 0.4;
                    }
                }
            }
        }

        // 3. Batched Rain Streaks
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 2, p.y + p.length);
        }
        ctx.strokeStyle = `rgba(186, 230, 253, ${0.42 * glowFactor})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 4. Batched Droplet Head Beads
        ctx.beginPath();
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const hy = p.y + p.length;
            ctx.moveTo(p.x + 1.6, hy);
            ctx.arc(p.x, hy, 1.6, 0, Math.PI * 2);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 5. Batched Ground Splashes
        if (extraState?.splashes && extraState.splashes.length > 0) {
            ctx.beginPath();
            for (let i = extraState.splashes.length - 1; i >= 0; i--) {
                const splash = extraState.splashes[i];
                splash.r += splash.speed * speedMult;
                splash.alpha -= 0.038;
                if (splash.alpha <= 0) {
                    extraState.splashes.splice(i, 1);
                    continue;
                }
                ctx.moveTo(splash.x + splash.r * 1.8, splash.y);
                ctx.ellipse(splash.x, splash.y, splash.r * 1.8, splash.r * 0.5, 0, 0, Math.PI * 2);
            }
            ctx.strokeStyle = `rgba(${accentRgb}, ${0.45 * glowFactor})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 4. MATRIX CODE: Multi-Depth Phosphor Katakana & EMP Shockwave
    // ─────────────────────────────────────────────────────────────
    const renderMatrix = () => {
        // Sort by background/foreground
        for (const col of particles) {
            col.y += col.speed;

            // Random glyph flicker
            if (Math.random() < 0.15) {
                const idx = Math.floor(Math.random() * col.chars.length);
                col.chars[idx] = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
            }

            // Interactive EMP Shockwave
            let isElectric = false;
            if (mouse.x !== null) {
                const distX = Math.abs(col.x - mouse.x);
                if (distX < 90) {
                    const distY = Math.abs(col.y - mouse.y);
                    if (distY < 160) {
                        isElectric = true;
                        col.highlight = 1;
                    }
                }
            }
            if (col.highlight > 0) col.highlight *= 0.93;

            ctx.font = `700 ${col.fontSize}px "SF Mono", monospace, "Segoe UI Symbol"`;

            for (let i = 0; i < col.length; i++) {
                const charY = col.y - i * (col.fontSize + 2);
                if (charY < -col.fontSize || charY > height + col.fontSize) continue;

                const char = col.chars[i % col.chars.length];
                if (i === 0) {
                    // Phosphor leading head
                    ctx.fillStyle = isElectric ? '#38bdf8' : '#ffffff';
                    ctx.shadowBlur = 12;
                    ctx.shadowColor = isElectric ? '#38bdf8' : accent;
                } else {
                    ctx.shadowBlur = 0;
                    const fade = 1 - (i / col.length);
                    const alpha = Math.max(0.08, fade * (isElectric || col.highlight > 0.15 ? 0.95 : (col.isForeground ? 0.75 : 0.35)));
                    ctx.fillStyle = `rgba(${accentRgb}, ${alpha})`;
                }
                ctx.fillText(char, col.x, charY);
            }
            ctx.shadowBlur = 0;

            if (col.y - col.length * (col.fontSize + 2) > height) {
                col.y = Math.random() * -80;
                col.speed = (Math.random() * 2.5 + 2.0) * (col.isForeground ? 1.0 : 0.6);
            }
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 5. HYPERSPACE WARP: Batched Perspective Starfield
    // ─────────────────────────────────────────────────────────────
    const renderWarp = () => {
        if (!extraState) return;

        if (mouse.x !== null && mouse.y !== null) {
            extraState.targetCenterX = width / 2 + (mouse.x - width / 2) * 0.4;
            extraState.targetCenterY = height / 2 + (mouse.y - height / 2) * 0.4;
        } else {
            extraState.targetCenterX = width / 2;
            extraState.targetCenterY = height / 2;
        }
        extraState.centerX += (extraState.targetCenterX - extraState.centerX) * 0.08;
        extraState.centerY += (extraState.targetCenterY - extraState.centerY) * 0.08;

        const hyperBoost = mouse.isDown ? 20 : 0;
        const speed = 6 + hyperBoost + Math.min(mouse.speed * 0.3, 14);
        const fov = width * 0.7;

        // Batched star streak lines
        ctx.beginPath();
        for (const star of particles) {
            star.pz = star.z;
            star.z -= speed;

            if (star.z <= 0) {
                star.z = width;
                star.pz = width;
                star.x = (Math.random() - 0.5) * width * 2.2;
                star.y = (Math.random() - 0.5) * height * 2.2;
            }

            const k = fov / star.z;
            const sx = star.x * k + extraState.centerX;
            const sy = star.y * k + extraState.centerY;

            const pk = fov / star.pz;
            const px = star.x * pk + extraState.centerX;
            const py = star.y * pk + extraState.centerY;

            if (sx < -20 || sx > width + 20 || sy < -20 || sy > height + 20) continue;

            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(224, 242, 254, 0.7)`;
        ctx.lineWidth = mouse.isDown ? 2.8 : 1.6;
        ctx.stroke();
    };

    // ─────────────────────────────────────────────────────────────
    // 6. AURORA WAVE: Liquid Ribbons
    // ─────────────────────────────────────────────────────────────
    const renderWave = () => {
        if (!extraState) return;
        globalTime += 0.016;

        const baseY = height * 0.62;
        const waves = extraState.waves;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        for (let w = 0; w < waves.length; w++) {
            const wave = waves[w];
            ctx.beginPath();
            ctx.moveTo(0, height);

            for (let x = 0; x <= width; x += 16) {
                let yOffset = Math.sin(x * wave.freq + globalTime * (1 + w * 0.35)) * wave.amp +
                              Math.cos(x * (wave.freq * 0.65) - globalTime * 0.75) * (wave.amp * 0.55);

                if (mouse.x !== null) {
                    const dx = Math.abs(x - mouse.x);
                    if (dx < 220) {
                        const falloff = Math.exp(-Math.pow(dx / 95, 2));
                        const pull = (mouse.y - baseY) * 0.38;
                        yOffset += pull * falloff;
                    }
                }

                const y = baseY + yOffset + (w * 24);
                ctx.lineTo(x, y);
            }

            ctx.lineTo(width, height);
            ctx.closePath();

            ctx.fillStyle = wave.color;
            ctx.fill();

            ctx.strokeStyle = wave.stroke;
            ctx.lineWidth = 1.6;
            ctx.stroke();
        }
        ctx.restore();
    };

    // ─────────────────────────────────────────────────────────────
    // 7. GRAVITATIONAL GALAXY: Batched Accretion Disk
    // ─────────────────────────────────────────────────────────────
    const renderGalaxy = () => {
        const cx = width / 2;
        const cy = height * 0.52;

        ctx.beginPath();
        for (const p of particles) {
            p.angle += p.speed;
            let px = cx + Math.cos(p.angle) * p.dist;
            let py = cy + Math.sin(p.angle) * (p.dist * 0.52);

            if (mouse.x !== null) {
                const dx = mouse.x - px;
                const dy = mouse.y - py;
                if (Math.abs(dx) < 240 && Math.abs(dy) < 240) {
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 240 ** 2 && distSq > 400) {
                        const dist = Math.sqrt(distSq);
                        const force = (240 - dist) / 240;
                        px += dx * force * 0.16;
                        py += dy * force * 0.16;
                        p.angle += (mouse.isDown ? 0.05 : 0.015) * force;
                    }
                }
            }

            ctx.moveTo(px + p.radius, py);
            ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        }
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.75;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    };

    // ─────────────────────────────────────────────────────────────
    // 8. BIOLUMINESCENT FIREFLIES: Cached Glow Sprites
    // ─────────────────────────────────────────────────────────────
    const renderFireflies = () => {
        // Stardust crumbs pool
        if (Math.random() < 0.22 && particles.length > 0 && secondaryParticles.length < 15) {
            const parent = particles[Math.floor(Math.random() * particles.length)];
            if (!parent.isBokeh) {
                secondaryParticles.push({
                    x: parent.x,
                    y: parent.y,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    alpha: 0.6,
                    radius: Math.random() * 1.2 + 0.6
                });
            }
        }

        if (secondaryParticles.length > 0) {
            ctx.beginPath();
            for (let i = secondaryParticles.length - 1; i >= 0; i--) {
                const crumb = secondaryParticles[i];
                crumb.x += crumb.vx;
                crumb.y += crumb.vy;
                crumb.alpha -= 0.025;
                if (crumb.alpha <= 0) {
                    secondaryParticles.splice(i, 1);
                    continue;
                }
                ctx.moveTo(crumb.x + crumb.radius, crumb.y);
                ctx.arc(crumb.x, crumb.y, crumb.radius, 0, Math.PI * 2);
            }
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.6;
            ctx.fill();
        }

        for (const p of particles) {
            p.vx += (Math.random() - 0.5) * 0.1;
            p.vy += (Math.random() - 0.5) * 0.1;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -30) p.x = width + 30;
            if (p.x > width + 30) p.x = -30;
            if (p.y < -30) p.y = height + 30;
            if (p.y > height + 30) p.y = -30;

            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                if (Math.abs(dx) < 200 && Math.abs(dy) < 200) {
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 200 ** 2 && distSq > 1) {
                        const dist = Math.sqrt(distSq);
                        p.vx += (dx / dist) * 0.35;
                        p.vy += (dy / dist) * 0.35;
                    }
                }
            }

            p.pulse += p.pulseSpeed;
            const currentAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.pulse));

            if (glowSpriteCanvas) {
                const glowR = p.radius * (p.isBokeh ? 3.0 : 4.5);
                ctx.globalAlpha = Math.min(1.0, currentAlpha * (p.isBokeh ? 0.35 : 0.85));
                ctx.drawImage(glowSpriteCanvas, p.x - glowR * 0.5, p.y - glowR * 0.5, glowR, glowR);
            }

            if (!p.isBokeh) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = currentAlpha;
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
    };

    // ─────────────────────────────────────────────────────────────
    // 9. RETRO SYNTHWAVE: 3D Wireframe Terrain & Sunset Horizon
    // ─────────────────────────────────────────────────────────────
    const renderSynthwave = () => {
        if (!extraState) return;
        const horizonY = height * 0.48;
        const effectiveSpeed = 2.4 * speedMult;
        extraState.gridOffset = (extraState.gridOffset + effectiveSpeed) % 40;

        // 1. Neon Sunset Sun
        const sunRadius = Math.min(width, height) * 0.18;
        const sunX = width / 2;
        const sunY = horizonY - sunRadius * 0.35;

        // Background dark sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
        skyGrad.addColorStop(0, '#0a0518');
        skyGrad.addColorStop(0.7, '#1b0e36');
        skyGrad.addColorStop(1, '#3b1259');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, horizonY);

        // Sun gradient with horizontal blind stripes
        const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
        sunGrad.addColorStop(0, '#fef08a');
        sunGrad.addColorStop(0.4, '#f43f5e');
        sunGrad.addColorStop(1, '#c026d3');

        ctx.save();
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fillStyle = sunGrad;
        ctx.shadowBlur = 35 * glowMult;
        ctx.shadowColor = '#f43f5e';
        ctx.fill();
        ctx.restore();

        // Horizontal sun blind slots (classic 80s synthwave)
        const blindCount = 8;
        for (let b = 0; b < blindCount; b++) {
            const by = sunY + (b / blindCount) * sunRadius * 0.95;
            const bHeight = 2 + b * 1.4;
            ctx.fillStyle = '#0f0821';
            ctx.fillRect(sunX - sunRadius - 10, by, sunRadius * 2 + 20, bHeight);
        }

        // 2. 3D Wireframe Perspective Grid Floor
        const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
        floorGrad.addColorStop(0, '#0d061f');
        floorGrad.addColorStop(1, '#05020c');
        // 1. Draw pre-rendered sky & sun in 1 GPU texture blit
        if (offscreenBgCanvas) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(offscreenBgCanvas, 0, 0);
            ctx.restore();
        }

        // 2. Horizon neon glow line
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 3. Batched longitudinal perspective lines
        const linesCount = 24;
        const centerX = width / 2;
        ctx.beginPath();
        for (let l = -linesCount / 2; l <= linesCount / 2; l++) {
            const bottomX = centerX + l * (width / (linesCount * 0.45));
            ctx.moveTo(centerX + l * 2, horizonY);
            ctx.lineTo(bottomX, height);
        }
        ctx.strokeStyle = `rgba(${accentRgb}, ${0.35 * glowMult})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 4. Latitudinal moving gridlines
        const zSlices = 18;
        for (let z = 1; z <= zSlices; z++) {
            const rawZ = z * 40 - extraState.gridOffset;
            if (rawZ <= 0) continue;
            const norm = rawZ / (zSlices * 40);
            const y = horizonY + Math.pow(norm, 2.2) * (height - horizonY);

            let elevWarp = 0;
            if (mouse.x !== null && mouse.y > horizonY) {
                const distY = Math.abs(y - mouse.y);
                if (distY < 75) {
                    elevWarp = (1 - distY / 75) * (mouse.isDown ? -26 : -12);
                }
            }

            const alpha = norm * 0.8 * glowMult;
            ctx.beginPath();
            ctx.moveTo(0, y + elevWarp);
            ctx.lineTo(width, y + elevWarp);
            ctx.strokeStyle = z % 4 === 0 ? '#f43f5e' : `rgba(${accentRgb}, ${alpha})`;
            ctx.lineWidth = Math.max(0.8, norm * 2.0);
            ctx.stroke();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 10. QUANTUM FLOW: Batched Vector Streamers
    // ─────────────────────────────────────────────────────────────
    const renderQuantum = () => {
        globalTime += 0.008 * speedMult;
        const effectiveGlow = glowMult;

        for (const p of particles) {
            const scale = 0.0035;
            const angle1 = Math.sin(p.x * scale + globalTime) * Math.cos(p.y * scale + globalTime) * Math.PI * 4;
            const angle2 = Math.cos(p.x * (scale * 1.5) - globalTime * 0.5) * Math.PI * 2;
            let targetAngle = angle1 + angle2;

            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                if (Math.abs(dx) < 200 && Math.abs(dy) < 200) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200 && dist > 2) {
                        const mouseAngle = Math.atan2(dy, dx) + (mouse.isDown ? Math.PI : Math.PI / 2);
                        const blend = (200 - dist) / 200;
                        targetAngle = targetAngle * (1 - blend) + mouseAngle * blend;
                        p.energy = Math.min(1.0, p.energy + 0.05);
                    }
                }
            }

            p.vx = Math.cos(targetAngle) * p.speed * speedMult;
            p.vy = Math.sin(targetAngle) * p.speed * speedMult;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            p.history.push({ x: p.x, y: p.y });
            if (p.history.length > p.maxHistory) {
                p.history.shift();
            }

            if (p.history.length > 2) {
                ctx.beginPath();
                ctx.moveTo(p.history[0].x, p.history[0].y);
                for (let h = 1; h < p.history.length; h++) {
                    const prev = p.history[h - 1];
                    const curr = p.history[h];
                    if (Math.abs(curr.x - prev.x) > 60 || Math.abs(curr.y - prev.y) > 60) {
                        ctx.moveTo(curr.x, curr.y);
                        continue;
                    }
                    ctx.lineTo(curr.x, curr.y);
                }

                const streamAlpha = p.energy * 0.45 * effectiveGlow;
                ctx.strokeStyle = p.colorOffset > 10 ? `rgba(168, 85, 247, ${streamAlpha})` : `rgba(${accentRgb}, ${streamAlpha})`;
                ctx.lineWidth = Math.max(0.8, p.energy * 1.8);
                ctx.stroke();
            }

            p.energy = Math.max(0.35, p.energy - 0.005);
        }
    };

    // ─── Main Animation Loop (60 FPS Locked) ───
    const scheduleAnimation = () => {
        if (!isRunning || document.hidden || animationId !== null) return;
        animationId = requestAnimationFrame(animate);
    };

    const animate = (timestamp = performance.now()) => {
        animationId = null;
        if (!isRunning || !canvas || !ctx || document.hidden) return;

        // Frame limiter: locks to 60 FPS preventing monitor overload at 120Hz-240Hz
        const delta = timestamp - lastFrameTimestamp;
        const caps = getHardwareCapabilities();
        const effectiveMinMs = caps.throttleAnimations ? 1000 / 30 : FRAME_MIN_MS;
        if (delta < effectiveMinMs) {
            scheduleAnimation();
            return;
        }
        lastFrameTimestamp = timestamp;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        if (theme === 'neural') {
            renderNeural();
        } else if (theme === 'bubbles') {
            renderBubbles();
        } else if (theme === 'rain') {
            renderRain();
        } else if (theme === 'matrix') {
            renderMatrix();
        } else if (theme === 'warp') {
            renderWarp();
        } else if (theme === 'wave') {
            renderWave();
        } else if (theme === 'galaxy') {
            renderGalaxy();
        } else if (theme === 'fireflies') {
            renderFireflies();
        } else if (theme === 'synthwave') {
            renderSynthwave();
        } else if (theme === 'quantum') {
            renderQuantum();
        }

        scheduleAnimation();
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            if (animationId !== null) cancelAnimationFrame(animationId);
            animationId = null;
            return;
        }

        lastFrameTimestamp = performance.now();
        scheduleAnimation();
    };

    const setOptions = (opts = {}) => {
        let needsRebuild = false;
        if (typeof opts.speed === 'number' && !isNaN(opts.speed)) {
            speedMult = Math.max(0.2, Math.min(3.0, opts.speed));
        }
        if (typeof opts.density === 'number' && !isNaN(opts.density)) {
            const nextDensity = Math.max(0.4, Math.min(2.5, opts.density));
            if (Math.abs(nextDensity - densityMult) > 0.15) {
                densityMult = nextDensity;
                needsRebuild = true;
            }
        }
        if (typeof opts.glow === 'number' && !isNaN(opts.glow)) {
            glowMult = Math.max(0.2, Math.min(2.5, opts.glow));
        }

        if (needsRebuild && isRunning) {
            createParticles();
        }
    };

    const stop = () => {
        isRunning = false;

        if (animationId !== null) cancelAnimationFrame(animationId);
        if (resizeId !== null) cancelAnimationFrame(resizeId);
        if (resizeTimer) clearTimeout(resizeTimer);
        animationId = null;
        resizeId = null;

        window.removeEventListener('resize', scheduleResize);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('mouseleave', clearPointer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        accentObserver?.disconnect();
        accentObserver = null;

        particles = [];
        secondaryParticles = [];
        extraState = null;
        clearPointer();
        if (ctx) ctx.clearRect(0, 0, width, height);
    };

    const init = (element, style, opts = {}) => {
        stop();
        canvas = element;
        if (!canvas) return;

        ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;

        theme = style || 'neural';
        if (opts.speed) speedMult = Number(opts.speed) || 1.0;
        if (opts.density) densityMult = Number(opts.density) || 1.0;
        if (opts.glow) glowMult = Number(opts.glow) || 1.0;

        isRunning = true;
        lastFrameTimestamp = performance.now();
        updateAccent();
        resize();

        window.addEventListener('resize', scheduleResize);
        window.addEventListener('pointermove', handlePointerMove, { passive: true });
        window.addEventListener('pointerdown', handlePointerDown, { passive: true });
        window.addEventListener('pointerup', handlePointerUp, { passive: true });
        document.addEventListener('mouseleave', clearPointer);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        accentObserver = new MutationObserver(updateAccent);
        accentObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'style']
        });

        scheduleAnimation();
    };

    return { init, stop, setOptions };
})();
