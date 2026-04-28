import { state } from './state.js';

export const CanvasEngine = (() => {
    let canvas, ctx, animationId, particles = [], width, height, theme = 'neural', isRunning = false;
    let mouse = { x: null, y: null };

    const init = (el, style) => {
        stop();
        canvas = el;
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        theme = style || 'neural';
        isRunning = true;
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        animate();
    };

    const handleMouseMove = (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    };

    const resize = () => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        createParticles();
    };

    const createParticles = () => {
        particles = [];
        const count = theme === 'rain' ? 150 : 100;
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * (theme === 'neural' ? 1.5 : 0.5),
                vy: theme === 'rain' ? Math.random() * 15 + 5 : (Math.random() - 0.5) * 1.5,
                radius: theme === 'bubbles' ? Math.random() * 15 + 2 : Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2,
                color: theme === 'neural' ? '#7b61ff' : 'rgba(255, 255, 255, 0.3)'
            });
        }
    };

    const animate = () => {
        if (!canvas) return;
        ctx.clearRect(0, 0, width, height);
        
        // Get accent color from CSS
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7b61ff';
        
        particles.forEach((p, i) => {
            if (theme === 'neural') {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
                
                // Neural magnetic pull from Commit 24 logic
                if (mouse.x !== null) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 250) {
                        const force = (250 - dist) / 250;
                        p.vx += dx * 0.003 * force;
                        p.vy += dy * 0.003 * force;
                        
                        // Line to mouse with glow
                        ctx.beginPath();
                        ctx.shadowBlur = 10;
                        ctx.shadowColor = accent;
                        ctx.strokeStyle = `rgba(${parseInt(accent.slice(1,3),16)}, ${parseInt(accent.slice(3,5),16)}, ${parseInt(accent.slice(5,7),16)}, ${force * 0.3})`;
                        ctx.lineWidth = 1.2;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                        ctx.shadowBlur = 0;
                    }
                }

                // Particle dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = accent;
                ctx.globalAlpha = p.opacity;
                ctx.fill();
                ctx.globalAlpha = 1.0;

                // Neural connections
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 180) {
                        ctx.beginPath();
                        ctx.strokeStyle = accent;
                        ctx.globalAlpha = (180 - dist) / 720;
                        ctx.lineWidth = 0.8;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            } else if (theme === 'bubbles') {
                // Water Bubbles from Commit 33
                p.y -= p.vy; 
                if (p.y < -50) p.y = height + 50;
                
                if (mouse.x !== null) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        p.x -= dx * 0.01;
                        p.y -= dy * 0.01;
                    }
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.4})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else if (theme === 'rain') {
                // Glass Rain from Commit 33
                p.y += p.vy;
                if (p.y > height) {
                    p.y = -20;
                    p.x = Math.random() * width;
                }
                
                if (mouse.x !== null) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 80) {
                        p.y -= 5;
                        p.vx += (Math.random() - 0.5) * 5;
                    }
                }

                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.2})`;
                ctx.lineWidth = 1;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.vx, p.y + 15);
                ctx.stroke();
            }
        });
        if (isRunning) animationId = requestAnimationFrame(animate);
    };

    const stop = () => {
        isRunning = false;
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', handleMouseMove);
        particles = [];
        if (ctx) ctx.clearRect(0, 0, width, height);
    };

    return { init, stop };
})();
