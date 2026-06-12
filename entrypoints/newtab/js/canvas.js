const NEURAL_CONNECTION_DISTANCE = 180;
const NEURAL_CONNECTION_DISTANCE_SQ = NEURAL_CONNECTION_DISTANCE ** 2;
const MOUSE_PULL_DISTANCE = 250;
const MOUSE_PULL_DISTANCE_SQ = MOUSE_PULL_DISTANCE ** 2;
const BUBBLE_MOUSE_DISTANCE_SQ = 150 ** 2;
const RAIN_MOUSE_DISTANCE_SQ = 80 ** 2;

export const CanvasEngine = (() => {
    let canvas;
    let ctx;
    let animationId = null;
    let resizeId = null;
    let accentObserver = null;
    let particles = [];
    let width = 0;
    let height = 0;
    let theme = 'neural';
    let isRunning = false;
    let accent = '#7b61ff';
    let accentRgb = '123, 97, 255';
    const mouse = { x: null, y: null };

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

    const createParticles = () => {
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
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    };

    const clearPointer = () => {
        mouse.x = null;
        mouse.y = null;
    };

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
            ctx.strokeStyle = `rgba(${accentRgb}, ${force * 0.3})`;
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

    const drawBubbles = () => {
        for (const particle of particles) {
            particle.y -= particle.vy;
            if (particle.y < -50) particle.y = height + 50;

            if (mouse.x !== null) {
                const dx = mouse.x - particle.x;
                const dy = mouse.y - particle.y;
                if (dx * dx + dy * dy < BUBBLE_MOUSE_DISTANCE_SQ) {
                    particle.x -= dx * 0.01;
                    particle.y -= dy * 0.01;
                }
            }

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    };

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
                    particle.y -= 5;
                    particle.vx += (Math.random() - 0.5) * 5;
                }
            }

            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity * 0.5})`;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particle.x + particle.vx, particle.y + 25);
            ctx.stroke();
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
        document.removeEventListener('mouseleave', clearPointer);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        accentObserver?.disconnect();
        accentObserver = null;

        particles = [];
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
