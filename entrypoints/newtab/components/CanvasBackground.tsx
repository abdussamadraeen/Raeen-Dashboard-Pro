import React, { useEffect, useRef } from 'react';
import { useDashboardStore } from '../../../store/dashboardStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export const CanvasBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStyle = useDashboardStore((state) => state.settings.canvasStyle);
  const backgroundType = useDashboardStore((state) => state.settings.backgroundType);

  useEffect(() => {
    if (backgroundType !== 'canvas') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const mouse = { x: null as number | null, y: null as number | null };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      createParticles();
    };

    const createParticles = () => {
      particles = [];
      const count = canvasStyle === 'rain' ? 150 : 100;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (canvasStyle === 'neural' ? 1.5 : 0.5),
          vy: canvasStyle === 'rain' ? Math.random() * 5 + 3 : (Math.random() - 0.5) * 1.5,
          radius: canvasStyle === 'bubbles' ? Math.random() * 15 + 2 : Math.random() * 2 + 1,
          opacity: canvasStyle === 'rain' ? Math.random() * 0.5 + 0.5 : Math.random() * 0.5 + 0.2
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Get accent color from CSS variables, fallback to purple
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7b61ff';

      // Parse HEX color safely to RGBA
      const parseHex = (hex: string) => {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
          cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        const r = parseInt(cleanHex.substring(0, 2), 16) || 123;
        const g = parseInt(cleanHex.substring(2, 4), 16) || 97;
        const b = parseInt(cleanHex.substring(4, 6), 16) || 255;
        return { r, g, b };
      };

      const rgb = parseHex(accent);

      particles.forEach((p, i) => {
        if (canvasStyle === 'neural') {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;

          // Neural magnetic pull logic
          if (mouse.x !== null && mouse.y !== null) {
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
              ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${force * 0.3})`;
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
        } else if (canvasStyle === 'bubbles') {
          p.y -= p.vy;
          if (p.y < -50) p.y = height + 50;

          if (mouse.x !== null && mouse.y !== null) {
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
        } else if (canvasStyle === 'rain') {
          p.y += p.vy;
          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }

          if (mouse.x !== null && mouse.y !== null) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
              p.y -= 5;
              p.vx += (Math.random() - 0.5) * 5;
            }
          }

          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx, p.y + 25); // Streaks
          ctx.stroke();
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);

    resize();
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [canvasStyle, backgroundType]);

  if (backgroundType !== 'canvas') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      id="canvas-layer"
      className="background-layer fixed inset-0 w-full h-full -z-50 pointer-events-none block"
    />
  );
};
