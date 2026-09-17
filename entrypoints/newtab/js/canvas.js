/**
 * Ultra-HD / 3D Artistic Interactive Canvas Engine
 * Features:
 * - Retina / High-DPI DPR auto-scaling (Crystal crisp on 4K & Retina displays)
 * - Multi-layer 3D perspective depth, volumetric illumination, and particle physics
 * - 8 High-end interactive themes:
 *   1. Neural Network (3D synaptic depth with traveling action potential pulses)
 *   2. Water Bubbles (3D iridescent glass orbs with specular crescent reflections)
 *   3. Glass Rain (Cinematic cyberpunk rain with motion blur & ground splash ripples)
 *   4. Matrix Code Stream (Multi-depth phosphor Katakana/hex rain with EMP shockwaves)
 *   5. Hyperspace Warp (3D starfield with dynamic cockpit steering & hyper-boost trails)
 *   6. Aurora Wave Flow (Luminous liquid ribbons with fluid mouse ripples & screen blending)
 *   7. Gravitational Galaxy (Dual-arm spiral galaxy with relativistic mouse vortex singularity)
 *   8. Bioluminescent Fireflies (Bokeh forest depth, stardust trails, and magnetic swarm physics)
 */

const MATRIX_GLYPHS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜXYZ@#$&*§ΔΩΨ';

export const CanvasEngine = (() => {
    let canvas;
    let ctx;
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
    let isRunning = false;
    let accent = '#38bdf8';
    let accentRgb = '56, 189, 248';
    let globalTime = 0;

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
    };

    // ─── Particle & Architecture Generator ───
    const createParticles = () => {
        if (!width || !height) return;
        particles = [];
        secondaryParticles = [];
        extraState = null;

        if (theme === 'neural') {
            // 3D Synaptic Brain Network
            const count = 110;
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.8 + 0.2; // 3D depth
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: (Math.random() - 0.5) * 1.2 * z,
                    vy: (Math.random() - 0.5) * 1.2 * z,
                    baseRadius: Math.random() * 2.2 + 1.2,
                    radius: (Math.random() * 2.2 + 1.2) * z,
                    opacity: (Math.random() * 0.4 + 0.4) * z,
                    pulsePhase: Math.random() * Math.PI * 2
                };
            });
            // Action potential pulses traveling along connections
            secondaryParticles = [];
        } else if (theme === 'bubbles') {
            // 3D Iridescent Soap / Glass Orbs
            const count = 55;
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.7 + 0.3;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: (Math.random() - 0.5) * 0.5 * z,
                    vy: (Math.random() * 1.2 + 0.6) * z,
                    radius: (Math.random() * 22 + 8) * z,
                    wobbleSpeed: Math.random() * 0.04 + 0.02,
                    wobbleAmp: Math.random() * 2 + 1,
                    wobblePhase: Math.random() * Math.PI * 2,
                    opacity: Math.random() * 0.35 + 0.35,
                    hueOffset: Math.random() * 40 - 20
                };
            });
        } else if (theme === 'rain') {
            // Cinematic Cyberpunk Rain with 3D Depth
            const count = 180;
            particles = Array.from({ length: count }, () => {
                const z = Math.random() * 0.8 + 0.2;
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    z,
                    vx: -1.2 * z,
                    vy: (Math.random() * 12 + 14) * z,
                    length: (Math.random() * 25 + 15) * z,
                    thickness: (Math.random() * 1.5 + 0.8) * z,
                    opacity: (Math.random() * 0.4 + 0.35) * z
                };
            });
            // Ground splash ripples
            secondaryParticles = [];
        } else if (theme === 'matrix') {
            // 3D Dual-Depth Matrix Code Rain
            const cols = Math.floor(width / 18);
            particles = Array.from({ length: cols }, (_, i) => {
                const isForeground = Math.random() > 0.4;
                const fontSize = isForeground ? 16 : 11;
                return {
                    x: i * 18,
                    y: Math.random() * -height,
                    speed: (Math.random() * 2.5 + 2.0) * (isForeground ? 1.0 : 0.6),
                    length: Math.floor(Math.random() * 18 + 12),
                    chars: Array.from({ length: 30 }, () => MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)]),
                    fontSize,
                    isForeground,
                    highlight: 0
                };
            });
        } else if (theme === 'warp') {
            // 3D Deep Space Hyperspace Warp
            const count = 380;
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
            // Luminous Aurora Borealis Ribbons
            extraState = {
                waves: [
                    { amp: 65, freq: 0.0022, speed: 0.016, color: `rgba(${accentRgb}, 0.22)`, stroke: accent },
                    { amp: 48, freq: 0.0036, speed: -0.014, color: 'rgba(56, 189, 248, 0.18)', stroke: '#38bdf8' },
                    { amp: 80, freq: 0.0016, speed: 0.022, color: 'rgba(168, 85, 247, 0.15)', stroke: '#c084fc' },
                    { amp: 40, freq: 0.0048, speed: -0.018, color: 'rgba(16, 185, 129, 0.20)', stroke: '#34d399' }
                ]
            };
        } else if (theme === 'galaxy') {
            // Relativistic 3D Spiral Galaxy with Galactic Core
            const count = 320;
            const maxR = Math.min(width, height) * 0.48;
            particles = Array.from({ length: count }, () => {
                const dist = Math.pow(Math.random(), 1.5) * maxR + 8;
                const arm = Math.random() < 0.5 ? 0 : Math.PI;
                const angle = dist * 0.012 + arm + (Math.random() - 0.5) * 0.42;
                const isCore = dist < maxR * 0.18;
                return {
                    dist,
                    baseDist: dist,
                    angle,
                    speed: (0.005 + 10 / (dist + 35)),
                    radius: isCore ? (Math.random() * 2.8 + 1.2) : (Math.random() * 1.8 + 0.7),
                    alpha: Math.random() * 0.5 + 0.4,
                    color: isCore
                        ? '#ffffff'
                        : (Math.random() > 0.45 ? accent : (Math.random() > 0.5 ? '#38bdf8' : '#e9d5ff'))
                };
            });
        } else if (theme === 'fireflies') {
            // Enchanted Bioluminescent Forest with Depth Bokeh
            const count = 75;
            particles = Array.from({ length: count }, () => {
                const isBokeh = Math.random() < 0.25; // Distant blurred bokeh sphere
                return {
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: (Math.random() - 0.5) * 0.7,
                    radius: isBokeh ? (Math.random() * 14 + 8) : (Math.random() * 2.8 + 1.5),
                    isBokeh,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.035 + 0.015,
                    color: Math.random() > 0.4 ? accent : '#facc15'
                };
            });
            secondaryParticles = []; // Stardust trail crumbs
        }
    };

    // ─── Retina / High-DPI HD Resize ───
    const resize = () => {
        resizeId = null;
        if (!canvas || !ctx) return;

        dpr = Math.min(window.devicePixelRatio || 1, 2);
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

    const scheduleResize = () => {
        if (resizeId !== null) return;
        resizeId = requestAnimationFrame(resize);
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
        // Spawn periodic action potential pulses along random synapses
        if (Math.random() < 0.12 && particles.length > 2) {
            const i1 = Math.floor(Math.random() * particles.length);
            const p1 = particles[i1];
            for (let i2 = 0; i2 < particles.length; i2++) {
                if (i1 === i2) continue;
                const p2 = particles[i2];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                if (dx * dx + dy * dy < 160 ** 2) {
                    secondaryParticles.push({
                        fromX: p1.x, fromY: p1.y,
                        toX: p2.x, toY: p2.y,
                        progress: 0,
                        speed: Math.random() * 0.04 + 0.02
                    });
                    break;
                }
            }
        }

        // Draw connections with spatial grid
        const connDist = 165;
        const connDistSq = connDist * connDist;

        ctx.lineWidth = 0.9;
        for (let i = 0; i < particles.length; i++) {
            const p1 = particles[i];
            p1.x += p1.vx;
            p1.y += p1.vy;
            if (p1.x < 0 || p1.x > width) p1.vx *= -1;
            if (p1.y < 0 || p1.y > height) p1.vy *= -1;

            // Mouse gravitational stimulation
            if (mouse.x !== null) {
                const dx = mouse.x - p1.x;
                const dy = mouse.y - p1.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 220 ** 2) {
                    const dist = Math.sqrt(distSq);
                    const force = (220 - dist) / 220;
                    p1.vx += (dx / dist) * force * 0.25;
                    p1.vy += (dy / dist) * force * 0.25;

                    // Radiant cursor stimulation synapse
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${accentRgb}, ${force * 0.45})`;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.stroke();
                }
            }

            // Connect nearby nodes
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dSq = dx * dx + dy * dy;
                if (dSq < connDistSq) {
                    const alpha = (1 - Math.sqrt(dSq) / connDist) * 0.35 * Math.min(p1.z, p2.z);
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${accentRgb}, ${alpha})`;
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }

            // Draw glowing 3D node
            p1.pulsePhase += 0.03;
            const r = p1.radius * (1 + 0.15 * Math.sin(p1.pulsePhase));

            ctx.beginPath();
            ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
            ctx.fillStyle = accent;
            ctx.shadowBlur = 8 * p1.z;
            ctx.shadowColor = accent;
            ctx.globalAlpha = p1.opacity;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Render traveling action potential pulses
        for (let idx = secondaryParticles.length - 1; idx >= 0; idx--) {
            const pulse = secondaryParticles[idx];
            pulse.progress += pulse.speed;
            if (pulse.progress >= 1) {
                secondaryParticles.splice(idx, 1);
                continue;
            }
            const px = pulse.fromX + (pulse.toX - pulse.fromX) * pulse.progress;
            const py = pulse.fromY + (pulse.toY - pulse.fromY) * pulse.progress;

            ctx.beginPath();
            ctx.arc(px, py, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = accent;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
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

            // Mouse repulsion with fluid bounce
            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distSq = dx * dx + dy * dy;
                const repelDist = p.radius + 120;
                if (distSq < repelDist * repelDist) {
                    const dist = Math.sqrt(distSq) || 1;
                    const force = (repelDist - dist) / repelDist;
                    p.x -= (dx / dist) * force * 4.5;
                    p.y -= (dy / dist) * force * 4.5;
                }
            }

            const r = p.radius;
            // 1. Soft translucent inner sphere
            const sphereGrad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
            sphereGrad.addColorStop(0, `rgba(${accentRgb}, ${p.opacity * 0.25})`);
            sphereGrad.addColorStop(0.8, `rgba(${accentRgb}, ${p.opacity * 0.08})`);
            sphereGrad.addColorStop(1, `rgba(255, 255, 255, ${p.opacity * 0.4})`);

            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = sphereGrad;
            ctx.fill();

            // 2. Outer glowing glass rim
            ctx.lineWidth = 1.4 * p.z;
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.55})`;
            ctx.stroke();

            // 3. Specular reflection crescent (top-left 3D highlight)
            ctx.beginPath();
            ctx.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.35, Math.PI * 0.9, Math.PI * 1.8);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.85})`;
            ctx.lineWidth = 1.6 * p.z;
            ctx.stroke();

            // 4. Secondary ambient rim reflection (bottom-right iridescent tint)
            ctx.beginPath();
            ctx.arc(p.x + r * 0.25, p.y + r * 0.25, r * 0.45, 0, Math.PI * 0.6);
            ctx.strokeStyle = `rgba(${accentRgb}, ${p.opacity * 0.6})`;
            ctx.lineWidth = 1.2 * p.z;
            ctx.stroke();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 3. GLASS RAIN: Cyberpunk Rain & Ground Splash Ripples
    // ─────────────────────────────────────────────────────────────
    const renderRain = () => {
        for (const p of particles) {
            p.x += p.vx;
            p.y += p.vy;

            // Screen bottom collision -> spawn splash ripple
            if (p.y > height) {
                if (Math.random() < 0.35) {
                    secondaryParticles.push({
                        x: p.x,
                        y: height - Math.random() * 4,
                        r: 2,
                        maxR: Math.random() * 14 + 6,
                        alpha: 0.7,
                        speed: Math.random() * 0.8 + 0.5
                    });
                }
                p.y = -20;
                p.x = Math.random() * width;
            }

            // Mouse aerodynamic umbrella deflection
            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 110 ** 2) {
                    p.vx -= (dx / 110) * 3;
                    p.y -= 4;
                }
            }

            // Motion-blur gradient raindrop streak
            const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.vx, p.y + p.length);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(0.6, `rgba(${accentRgb}, ${p.opacity * 0.4})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${p.opacity})`);

            ctx.beginPath();
            ctx.lineWidth = p.thickness;
            ctx.strokeStyle = grad;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx, p.y + p.length);
            ctx.stroke();
        }

        // Render expanding neon splash ripples
        for (let i = secondaryParticles.length - 1; i >= 0; i--) {
            const ripple = secondaryParticles[i];
            ripple.r += ripple.speed;
            ripple.alpha -= 0.03;

            if (ripple.alpha <= 0) {
                secondaryParticles.splice(i, 1);
                continue;
            }

            ctx.beginPath();
            ctx.ellipse(ripple.x, ripple.y, ripple.r * 1.8, ripple.r * 0.6, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${accentRgb}, ${ripple.alpha})`;
            ctx.lineWidth = 1.0;
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
    // 5. HYPERSPACE WARP: 3D Flight Steering & Chromatic Trails
    // ─────────────────────────────────────────────────────────────
    const renderWarp = () => {
        if (!extraState) return;

        // Smooth cockpit steering towards cursor
        if (mouse.x !== null && mouse.y !== null) {
            extraState.targetCenterX = width / 2 + (mouse.x - width / 2) * 0.4;
            extraState.targetCenterY = height / 2 + (mouse.y - height / 2) * 0.4;
        } else {
            extraState.targetCenterX = width / 2;
            extraState.targetCenterY = height / 2;
        }
        extraState.centerX += (extraState.targetCenterX - extraState.centerX) * 0.08;
        extraState.centerY += (extraState.targetCenterY - extraState.centerY) * 0.08;

        const hyperBoost = mouse.isDown ? 24 : 0;
        const speed = 6 + hyperBoost + Math.min(mouse.speed * 0.3, 16);
        const fov = width * 0.7;

        // Central radiant warp nebula glow
        const coreGrad = ctx.createRadialGradient(
            extraState.centerX, extraState.centerY, 0,
            extraState.centerX, extraState.centerY, width * 0.35
        );
        coreGrad.addColorStop(0, `rgba(${accentRgb}, 0.12)`);
        coreGrad.addColorStop(0.5, `rgba(${accentRgb}, 0.03)`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, width, height);

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

            const depth = 1 - star.z / width;
            const alpha = Math.min(1, Math.max(0.12, depth * 1.2));

            // Chromatic velocity streaks
            const streakGrad = ctx.createLinearGradient(px, py, sx, sy);
            streakGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            streakGrad.addColorStop(0.7, star.colorType > 0.4 ? `rgba(${accentRgb}, ${alpha * 0.7})` : `rgba(168, 85, 247, ${alpha * 0.7})`);
            streakGrad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

            ctx.beginPath();
            ctx.strokeStyle = streakGrad;
            ctx.lineWidth = Math.max(0.9, depth * (mouse.isDown ? 4.5 : 3.2));
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        }
    };

    // ─────────────────────────────────────────────────────────────
    // 6. AURORA WAVE: Luminous Liquid Ribbons & Screen Blending
    // ─────────────────────────────────────────────────────────────
    const renderWave = () => {
        if (!extraState) return;
        globalTime += 0.018;

        const baseY = height * 0.62;
        const waves = extraState.waves;

        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Luminous optical blending

        for (let w = 0; w < waves.length; w++) {
            const wave = waves[w];
            ctx.beginPath();
            ctx.moveTo(0, height);

            for (let x = 0; x <= width; x += 10) {
                let yOffset = Math.sin(x * wave.freq + globalTime * (1 + w * 0.35)) * wave.amp +
                              Math.cos(x * (wave.freq * 0.65) - globalTime * 0.75) * (wave.amp * 0.55);

                // Mouse fluid displacement
                if (mouse.x !== null) {
                    const dx = Math.abs(x - mouse.x);
                    if (dx < 240) {
                        const falloff = Math.exp(-Math.pow(dx / 95, 2));
                        const pull = (mouse.y - baseY) * 0.42;
                        yOffset += pull * falloff;
                    }
                }

                const y = baseY + yOffset + (w * 26);
                if (x === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.lineTo(width, height);
            ctx.closePath();

            // Volumetric radiant gradient
            const grad = ctx.createLinearGradient(0, baseY - wave.amp - 20, 0, height);
            grad.addColorStop(0, wave.color);
            grad.addColorStop(0.6, 'rgba(10, 16, 30, 0.4)');
            grad.addColorStop(1, 'rgba(5, 8, 16, 0.9)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Crisp neon top stroke with halo
            ctx.strokeStyle = wave.stroke;
            ctx.lineWidth = 1.8;
            ctx.stroke();
        }
        ctx.restore();
    };

    // ─────────────────────────────────────────────────────────────
    // 7. GRAVITATIONAL GALAXY: Accretion Disk & Vortex Singularity
    // ─────────────────────────────────────────────────────────────
    const renderGalaxy = () => {
        const cx = width / 2;
        const cy = height * 0.52;

        // Galactic core radiant halo
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.25);
        coreGrad.addColorStop(0, `rgba(${accentRgb}, 0.16)`);
        coreGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.05)');
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(0, 0, width, height);

        for (const p of particles) {
            p.angle += p.speed;

            // Base 3D-tilted elliptical orbit
            let px = cx + Math.cos(p.angle) * p.dist;
            let py = cy + Math.sin(p.angle) * (p.dist * 0.52);

            // Relativistic mouse black-hole vortex
            if (mouse.x !== null) {
                const dx = mouse.x - px;
                const dy = mouse.y - py;
                const distSq = dx * dx + dy * dy;
                const captureRadius = 280;
                if (distSq < captureRadius * captureRadius && distSq > 400) {
                    const dist = Math.sqrt(distSq);
                    const force = (captureRadius - dist) / captureRadius;
                    px += dx * force * 0.16;
                    py += dy * force * 0.16;
                    p.angle += (mouse.isDown ? 0.05 : 0.015) * force;
                }
            }

            ctx.beginPath();
            ctx.arc(px, py, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = p.radius > 1.8 ? 8 : 0;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    };

    // ─────────────────────────────────────────────────────────────
    // 8. BIOLUMINESCENT FIREFLIES: Bokeh Depth & Stardust Trails
    // ─────────────────────────────────────────────────────────────
    const renderFireflies = () => {
        // Spawn stardust crumbs
        if (Math.random() < 0.28 && particles.length > 0) {
            const parent = particles[Math.floor(Math.random() * particles.length)];
            if (!parent.isBokeh) {
                secondaryParticles.push({
                    x: parent.x,
                    y: parent.y,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    alpha: 0.6,
                    radius: Math.random() * 1.2 + 0.6,
                    color: parent.color
                });
            }
        }

        // Draw stardust trail crumbs
        for (let i = secondaryParticles.length - 1; i >= 0; i--) {
            const crumb = secondaryParticles[i];
            crumb.x += crumb.vx;
            crumb.y += crumb.vy;
            crumb.alpha -= 0.02;
            if (crumb.alpha <= 0) {
                secondaryParticles.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(crumb.x, crumb.y, crumb.radius, 0, Math.PI * 2);
            ctx.fillStyle = crumb.color;
            ctx.globalAlpha = crumb.alpha;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        for (const p of particles) {
            // Brownian organic wander
            p.vx += (Math.random() - 0.5) * 0.12;
            p.vy += (Math.random() - 0.5) * 0.12;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -40) p.x = width + 40;
            if (p.x > width + 40) p.x = -40;
            if (p.y < -40) p.y = height + 40;
            if (p.y > height + 40) p.y = -40;

            // Mouse magnetic swarm / wind scatter
            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 240 && dist > 1) {
                    if (mouse.speed > 6 || mouse.isDown) {
                        p.vx -= (dx / dist) * 2.2;
                        p.vy -= (dy / dist) * 2.2;
                    } else {
                        p.vx += (dx / dist) * 0.42;
                        p.vy += (dy / dist) * 0.42;
                    }
                }
            }

            p.pulse += p.pulseSpeed;
            const currentAlpha = 0.25 + 0.7 * (0.5 + 0.5 * Math.sin(p.pulse));

            if (p.isBokeh) {
                // Large soft background bokeh sphere
                const bokehGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
                bokehGrad.addColorStop(0, `rgba(${accentRgb}, ${currentAlpha * 0.18})`);
                bokehGrad.addColorStop(0.7, `rgba(${accentRgb}, ${currentAlpha * 0.05})`);
                bokehGrad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = bokehGrad;
                ctx.fill();
            } else {
                // Crisp foreground firefly with multi-stop radial aura
                const glowR = p.radius * 4;
                const fireflyGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
                const rgb = p.color === accent ? accentRgb : '250, 204, 21';
                fireflyGrad.addColorStop(0, `rgba(${rgb}, ${currentAlpha * 0.9})`);
                fireflyGrad.addColorStop(0.35, `rgba(${rgb}, ${currentAlpha * 0.35})`);
                fireflyGrad.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
                ctx.fillStyle = fireflyGrad;
                ctx.fill();

                // High-intensity white ember core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = currentAlpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    };

    // ─── Main Animation Loop ───
    const scheduleAnimation = () => {
        if (!isRunning || document.hidden || animationId !== null) return;
        animationId = requestAnimationFrame(animate);
    };

    const animate = () => {
        animationId = null;
        if (!isRunning || !canvas || !ctx || document.hidden) return;

        ctx.clearRect(0, 0, width, height);

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
        }

        scheduleAnimation();
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            if (animationId !== null) cancelAnimationFrame(animationId);
            animationId = null;
            return;
        }

        scheduleAnimation();
    };

    const stop = () => {
        isRunning = false;

        if (animationId !== null) cancelAnimationFrame(animationId);
        if (resizeId !== null) cancelAnimationFrame(resizeId);
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

    const init = (element, style) => {
        stop();
        canvas = element;
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        if (!ctx) return;

        theme = style || 'neural';
        isRunning = true;
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

    return { init, stop };
})();
