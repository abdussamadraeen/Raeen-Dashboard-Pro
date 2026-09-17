const NEURAL_CONNECTION_DISTANCE = 180;
const NEURAL_CONNECTION_DISTANCE_SQ = NEURAL_CONNECTION_DISTANCE ** 2;
const MOUSE_PULL_DISTANCE = 250;
const MOUSE_PULL_DISTANCE_SQ = MOUSE_PULL_DISTANCE ** 2;
const BUBBLE_MOUSE_DISTANCE_SQ = 150 ** 2;
const RAIN_MOUSE_DISTANCE_SQ = 80 ** 2;

// Matrix Glyphs: Katakana, Numbers, and Tech Symbols
const MATRIX_CHARS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜXYZ@#$&*';

export const CanvasEngine = (() => {
    let canvas;
    let ctx;
    let animationId = null;
    let resizeId = null;
    let accentObserver = null;
    let particles = [];
    let extraState = null;
    let width = 0;
    let height = 0;
    let theme = 'neural';
    let isRunning = false;
    let accent = '#7b61ff';
    let accentRgb = '123, 97, 255';
    let waveTime = 0;

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

        accent = value || '#7b61ff';
        const hex = accent.replace('#', '');
        const normalized = hex.length === 3
            ? hex.split('').map((char) => char + char).join('')
            : hex;

        if (/^[0-9a-f]{6}$/i.test(normalized)) {
            accentRgb = `${parseInt(normalized.slice(0, 2), 16)}, ${parseInt(normalized.slice(2, 4), 16)}, ${parseInt(normalized.slice(4, 6), 16)}`;
        } else {
            accentRgb = '123, 97, 255';
        }
    };

    // ─── Particle & State Initializers ───
    const createParticles = () => {
        if (!width || !height) return;

        if (theme === 'neural' || theme === 'bubbles' || theme === 'rain') {
            const count = theme === 'rain' ? 150 : 100;
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * (theme === 'neural' ? 1.5 : 0.5),
                vy: theme === 'rain'
                    ? Math.random() * 5 + 3
                    : (Math.random() - 0.5) * 1.5,
                radius: theme === 'bubbles'
                    ? Math.random() * 15 + 2
                    : Math.random() * 2 + 1,
                opacity: theme === 'rain'
                    ? Math.random() * 0.5 + 0.5
                    : Math.random() * 0.5 + 0.2
            }));
            extraState = null;
        } else if (theme === 'matrix') {
            const fontSize = 16;
            const columns = Math.floor(width / fontSize);
            particles = Array.from({ length: columns }, (_, i) => ({
                x: i * fontSize,
                y: Math.random() * -height,
                speed: Math.random() * 2.5 + 1.8,
                length: Math.floor(Math.random() * 16 + 10),
                chars: Array.from({ length: 28 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
                lastSwitch: 0,
                highlight: 0
            }));
            extraState = { fontSize };
        } else if (theme === 'warp') {
            const count = 280;
            particles = Array.from({ length: count }, () => ({
                x: (Math.random() - 0.5) * width * 2,
                y: (Math.random() - 0.5) * height * 2,
                z: Math.random() * width,
                pz: 0,
                color: Math.random() > 0.3 ? `rgb(${accentRgb})` : '#ffffff'
            }));
            extraState = {
                centerX: width / 2,
                centerY: height / 2,
                targetCenterX: width / 2,
                targetCenterY: height / 2
            };
        } else if (theme === 'wave') {
            waveTime = 0;
            extraState = {
                waves: [
                    { amp: 55, freq: 0.0028, speed: 0.018, color: `rgba(${accentRgb}, 0.22)`, stroke: accent },
                    { amp: 42, freq: 0.0042, speed: -0.014, color: 'rgba(56, 189, 248, 0.16)', stroke: '#38bdf8' },
                    { amp: 68, freq: 0.002, speed: 0.022, color: 'rgba(168, 85, 247, 0.14)', stroke: '#c084fc' },
                    { amp: 35, freq: 0.005, speed: -0.018, color: 'rgba(16, 185, 129, 0.18)', stroke: '#34d399' }
                ]
            };
            particles = [];
        } else if (theme === 'galaxy') {
            const count = 220;
            const maxR = Math.min(width, height) * 0.46;
            particles = Array.from({ length: count }, () => {
                const dist = Math.pow(Math.random(), 1.6) * maxR + 10;
                const arm = Math.random() < 0.5 ? 0 : Math.PI;
                const angle = dist * 0.014 + arm + (Math.random() - 0.5) * 0.45;
                return {
                    dist,
                    baseDist: dist,
                    angle,
                    speed: (0.006 + 8 / (dist + 30)),
                    radius: Math.random() * 2 + 0.8,
                    alpha: Math.random() * 0.6 + 0.4,
                    color: Math.random() > 0.4 ? accent : (Math.random() > 0.5 ? '#38bdf8' : '#e9d5ff')
                };
            });
            extraState = null;
        } else if (theme === 'fireflies') {
            const count = 65;
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                radius: Math.random() * 2.8 + 1.8,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.03 + 0.015,
                color: Math.random() > 0.35 ? accent : '#facc15'
            }));
            extraState = null;
        }
    };

    const resize = () => {
        resizeId = null;
        if (!canvas) return;

        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
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

    // ─── 1. Neural Network Animation ───
    const updateNeuralParticles = () => {
        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > height) particle.vy *= -1;

            if (mouse.x === null) continue;

            const dx = mouse.x - particle.x;
            const dy = mouse.y - particle.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq >= MOUSE_PULL_DISTANCE_SQ) continue;

            const distance = Math.sqrt(distanceSq);
            const force = (MOUSE_PULL_DISTANCE - distance) / MOUSE_PULL_DISTANCE;
            particle.vx += dx * 0.003 * force;
            particle.vy += dy * 0.003 * force;

            ctx.beginPath();
            ctx.shadowBlur = 10;
            ctx.shadowColor = accent;
            ctx.strokeStyle = `rgba(${accentRgb}, ${force * 0.35})`;
            ctx.lineWidth = 1.2;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    };

    const drawNeuralParticles = () => {
        ctx.fillStyle = accent;

        for (const particle of particles) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.globalAlpha = particle.opacity;
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    };

    const drawNeuralConnections = () => {
        const grid = new Map();

        for (let index = 0; index < particles.length; index++) {
            const particle = particles[index];
            const cellX = Math.floor(particle.x / NEURAL_CONNECTION_DISTANCE);
            const cellY = Math.floor(particle.y / NEURAL_CONNECTION_DISTANCE);
            const key = `${cellX},${cellY}`;
            const cell = grid.get(key);

            if (cell) {
                cell.push(index);
            } else {
                grid.set(key, [index]);
            }
        }

        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.8;

        for (let index = 0; index < particles.length; index++) {
            const particle = particles[index];
            const cellX = Math.floor(particle.x / NEURAL_CONNECTION_DISTANCE);
            const cellY = Math.floor(particle.y / NEURAL_CONNECTION_DISTANCE);

            for (let x = cellX - 1; x <= cellX + 1; x++) {
                for (let y = cellY - 1; y <= cellY + 1; y++) {
                    const candidates = grid.get(`${x},${y}`);
                    if (!candidates) continue;

                    for (const otherIndex of candidates) {
                        if (otherIndex <= index) continue;

                        const other = particles[otherIndex];
                        const dx = particle.x - other.x;
                        const dy = particle.y - other.y;
                        const distanceSq = dx * dx + dy * dy;
                        if (distanceSq >= NEURAL_CONNECTION_DISTANCE_SQ) continue;

                        ctx.beginPath();
                        ctx.globalAlpha = (
                            NEURAL_CONNECTION_DISTANCE - Math.sqrt(distanceSq)
                        ) / 720;
                        ctx.moveTo(particle.x, particle.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.stroke();
                    }
                }
            }
        }

        ctx.globalAlpha = 1;
    };

    // ─── 2. Water Bubbles Animation ───
    const drawBubbles = () => {
        for (const particle of particles) {
            particle.y -= particle.vy;
            if (particle.y < -50) particle.y = height + 50;

            if (mouse.x !== null) {
                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                if (dx * dx + dy * dy < BUBBLE_MOUSE_DISTANCE_SQ) {
                    particle.x -= dx * 0.015;
                    particle.y -= dy * 0.015;
                }
            }

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${accentRgb}, ${particle.opacity * 0.45})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    };

    // ─── 3. Glass Rain Animation ───
    const drawRain = () => {
        ctx.lineWidth = 2;

        for (const particle of particles) {
            particle.y += particle.vy;
            if (particle.y > height) {
                particle.y = -20;
                particle.x = Math.random() * width;
            }

            if (mouse.x !== null) {
                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                if (dx * dx + dy * dy < RAIN_MOUSE_DISTANCE_SQ) {
                    particle.y -= 6;
                    particle.vx += (Math.random() - 0.5) * 5;
                }
            }

            ctx.beginPath();
            ctx.strokeStyle = `rgba(${accentRgb}, ${particle.opacity * 0.55})`;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x + particle.vx, particle.y + 24);
            ctx.stroke();
        }
    };

    // ─── 4. Cyber Matrix Rain Animation ───
    const drawMatrix = () => {
        if (!extraState) return;
        const fontSize = extraState.fontSize || 16;
        ctx.font = `600 ${fontSize}px "SF Mono", monospace, "Courier New"`;

        for (const col of particles) {
            col.y += col.speed;

            // Randomly switch a glyph
            if (Math.random() < 0.1) {
                const idx = Math.floor(Math.random() * col.chars.length);
                col.chars[idx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            }

            // Mouse interaction: highlight and electric distortion
            let isHovered = false;
            if (mouse.x !== null) {
                const distX = Math.abs(col.x - mouse.x);
                if (distX < 80) {
                    const distY = Math.abs(col.y - mouse.y);
                    if (distY < 180) {
                        isHovered = true;
                        col.highlight = 1;
                    }
                }
            }
            if (col.highlight > 0) col.highlight *= 0.92;

            // Draw stream of characters
            for (let i = 0; i < col.length; i++) {
                const charY = col.y - i * fontSize;
                if (charY < -fontSize || charY > height + fontSize) continue;

                const char = col.chars[i % col.chars.length];
                if (i === 0) {
                    // Head glyph: glowing white or intense neon
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = accent;
                } else {
                    ctx.shadowBlur = 0;
                    const fade = 1 - (i / col.length);
                    const alpha = Math.max(0.08, fade * (isHovered || col.highlight > 0.2 ? 0.95 : 0.6));
                    ctx.fillStyle = `rgba(${accentRgb}, ${alpha})`;
                }
                ctx.fillText(char, col.x, charY);
            }
            ctx.shadowBlur = 0;

            // Reset when column falls past bottom
            if (col.y - col.length * fontSize > height) {
                col.y = Math.random() * -60;
                col.speed = Math.random() * 2.5 + 1.8;
            }
        }
    };

    // ─── 5. Hyperspace Warp Speed Animation ───
    const drawWarp = () => {
        if (!extraState) return;

        // Smooth steering towards mouse
        if (mouse.x !== null && mouse.y !== null) {
            extraState.targetCenterX = width / 2 + (mouse.x - width / 2) * 0.35;
            extraState.targetCenterY = height / 2 + (mouse.y - height / 2) * 0.35;
        } else {
            extraState.targetCenterX = width / 2;
            extraState.targetCenterY = height / 2;
        }
        extraState.centerX += (extraState.targetCenterX - extraState.centerX) * 0.08;
        extraState.centerY += (extraState.targetCenterY - extraState.centerY) * 0.08;

        const baseSpeed = 5 + (mouse.isDown ? 18 : 0) + Math.min(mouse.speed * 0.25, 12);
        const fov = width * 0.65;

        for (const star of particles) {
            star.pz = star.z;
            star.z -= baseSpeed;

            if (star.z <= 0) {
                star.z = width;
                star.pz = width;
                star.x = (Math.random() - 0.5) * width * 2;
                star.y = (Math.random() - 0.5) * height * 2;
            }

            const k = fov / star.z;
            const sx = star.x * k + extraState.centerX;
            const sy = star.y * k + extraState.centerY;

            const pk = fov / star.pz;
            const px = star.x * pk + extraState.centerX;
            const py = star.y * pk + extraState.centerY;

            if (sx < 0 || sx > width || sy < 0 || sy > height) continue;

            const depthAlpha = Math.min(1, Math.max(0.1, 1 - star.z / width));
            ctx.beginPath();
            ctx.strokeStyle = star.color;
            ctx.globalAlpha = depthAlpha;
            ctx.lineWidth = Math.max(0.8, (1 - star.z / width) * 3.5);
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    };

    // ─── 6. Aurora Wave Flow Animation ───
    const drawWave = () => {
        if (!extraState) return;
        waveTime += 0.015;

        const baseY = height * 0.65;
        const waves = extraState.waves;

        for (let w = 0; w < waves.length; w++) {
            const wave = waves[w];
            ctx.beginPath();
            ctx.moveTo(0, height);

            for (let x = 0; x <= width; x += 12) {
                let yOffset = Math.sin(x * wave.freq + waveTime * (1 + w * 0.3)) * wave.amp +
                              Math.cos(x * (wave.freq * 0.7) - waveTime * 0.8) * (wave.amp * 0.5);

                // Mouse ripple elastic interaction
                if (mouse.x !== null) {
                    const dx = Math.abs(x - mouse.x);
                    if (dx < 220) {
                        const falloff = Math.exp(-Math.pow(dx / 90, 2));
                        const pull = (mouse.y - baseY) * 0.35;
                        yOffset += pull * falloff;
                    }
                }

                const y = baseY + yOffset + (w * 28);
                if (x === 0) ctx.lineTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.lineTo(width, height);
            ctx.closePath();

            // Gradient Fill
            const grad = ctx.createLinearGradient(0, baseY - 60, 0, height);
            grad.addColorStop(0, wave.color);
            grad.addColorStop(1, 'rgba(10, 14, 24, 0.8)');
            ctx.fillStyle = grad;
            ctx.fill();

            // Radiant Top Stroke
            ctx.strokeStyle = wave.stroke;
            ctx.lineWidth = 1.6;
            ctx.stroke();
        }
    };

    // ─── 7. Gravitational Galaxy Vortex Animation ───
    const drawGalaxy = () => {
        const cx = width / 2;
        const cy = height * 0.52;

        for (const p of particles) {
            p.angle += p.speed;

            // Base orbital coordinates
            let px = cx + Math.cos(p.angle) * p.dist;
            let py = cy + Math.sin(p.angle) * (p.dist * 0.55); // Elliptical 3D tilt

            // Mouse gravitational attractor
            if (mouse.x !== null) {
                const dx = mouse.x - px;
                const dy = mouse.y - py;
                const distSq = dx * dx + dy * dy;
                if (distSq < 260 ** 2 && distSq > 400) {
                    const dist = Math.sqrt(distSq);
                    const force = (260 - dist) / 260;
                    px += dx * force * 0.12;
                    py += dy * force * 0.12;
                    p.angle += (mouse.isDown ? 0.04 : 0.012) * force;
                }
            }

            ctx.beginPath();
            ctx.arc(px, py, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    };

    // ─── 8. Bioluminescent Fireflies Animation ───
    const drawFireflies = () => {
        for (const p of particles) {
            // Gentle wandering organic motion
            p.vx += (Math.random() - 0.5) * 0.15;
            p.vy += (Math.random() - 0.5) * 0.15;
            p.vx *= 0.97;
            p.vy *= 0.97;
            p.x += p.vx;
            p.y += p.vy;

            // Screen wrap
            if (p.x < -20) p.x = width + 20;
            if (p.x > width + 20) p.x = -20;
            if (p.y < -20) p.y = height + 20;
            if (p.y > height + 20) p.y = -20;

            // Mouse magnetic swarm / gust scatter
            if (mouse.x !== null) {
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 220 && dist > 1) {
                    if (mouse.speed > 6 || mouse.isDown) {
                        // Fast mouse = wind gusts scattering fireflies away
                        p.vx -= (dx / dist) * 1.8;
                        p.vy -= (dy / dist) * 1.8;
                    } else {
                        // Gentle mouse = magnetic bioluminescent swarm
                        p.vx += (dx / dist) * 0.35;
                        p.vy += (dy / dist) * 0.35;
                    }
                }
            }

            // Pulsing luminescence
            p.pulse += p.pulseSpeed;
            const currentAlpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(p.pulse));

            // Radiant soft orb
            const glowRadius = p.radius * 3.5;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
            grad.addColorStop(0, p.color === accent ? `rgba(${accentRgb}, ${currentAlpha})` : `rgba(250, 204, 21, ${currentAlpha})`);
            grad.addColorStop(0.4, p.color === accent ? `rgba(${accentRgb}, ${currentAlpha * 0.4})` : `rgba(250, 204, 21, ${currentAlpha * 0.4})`);
            grad.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Solid inner core
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = currentAlpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    };

    const scheduleAnimation = () => {
        if (!isRunning || document.hidden || animationId !== null) return;
        animationId = requestAnimationFrame(animate);
    };

    const animate = () => {
        animationId = null;
        if (!isRunning || !canvas || !ctx || document.hidden) return;

        ctx.clearRect(0, 0, width, height);

        if (theme === 'neural') {
            updateNeuralParticles();
            drawNeuralParticles();
            drawNeuralConnections();
        } else if (theme === 'bubbles') {
            drawBubbles();
        } else if (theme === 'rain') {
            drawRain();
        } else if (theme === 'matrix') {
            drawMatrix();
        } else if (theme === 'warp') {
            drawWarp();
        } else if (theme === 'wave') {
            drawWave();
        } else if (theme === 'galaxy') {
            drawGalaxy();
        } else if (theme === 'fireflies') {
            drawFireflies();
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
