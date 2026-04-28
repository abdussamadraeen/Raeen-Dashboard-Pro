export const CanvasEngine = (() => {
    let canvas, ctx, animationId, particles = [], width, height, theme = 'neural';
    let mouse = { x: null, y: null };

    const init = (el, style) => {
        canvas = el; ctx = canvas.getContext('2d');
        theme = style || 'neural';
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', (e) => { mouse.x = e.x; mouse.y = e.y; });
        animate();
    };

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createParticles();
    };

    const createParticles = () => {
        particles = [];
        const count = theme === 'rain' ? 100 : 80;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * (theme === 'neural' ? 1 : 0.5),
                vy: theme === 'rain' ? Math.random() * 15 + 5 : (Math.random() - 0.5) * 1,
                radius: theme === 'bubbles' ? Math.random() * 20 + 5 : Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    };

    const animate = () => {
        ctx.clearRect(0, 0, width, height);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7b61ff';

        particles.forEach((p, i) => {
            if (theme === 'neural') {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                if (mouse.x !== null) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        const force = (150 - dist) / 150;
                        p.vx += dx * 0.005 * force;
                        p.vy += dy * 0.005 * force;
                        p.radius = Math.min(4, p.radius + 0.1);
                    } else {
                        p.radius = Math.max(1, p.radius - 0.1);
                    }
                }

                const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                if (speed > 2) { p.vx *= 0.9; p.vy *= 0.9; }

                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(123, 97, 255, ${p.opacity})`; ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x, dy = p.y - p2.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(123, 97, 255, ${(150 - dist) / 150 * 0.2})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }

                if (mouse.x !== null) {
                    const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(123, 97, 255, ${(200 - dist) / 200 * 0.5})`;
                        ctx.lineWidth = 1.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }

            } else if (theme === 'bubbles') {
                p.y -= p.vy; if (p.y < -50) p.y = height + 50;

                if (mouse.x !== null) {
                    const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        p.x -= dx * 0.02;
                        p.y -= dy * 0.02;
                    }
                }

                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`; ctx.lineWidth = 2; ctx.stroke();
            } else if (theme === 'rain') {
                p.y += p.vy; if (p.y > height) { p.y = -20; p.x = Math.random() * width; }

                if (mouse.x !== null) {
                    const dx = mouse.x - p.x, dy = mouse.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 50) { p.y -= 10; p.vx += (Math.random() - 0.5) * 10; }
                }

                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.3})`;
                ctx.lineWidth = 1.5; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx, p.y + 20); ctx.stroke();
            }
        });
        animationId = requestAnimationFrame(animate);
    };

    const stop = () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
    return { init, stop };
})();
