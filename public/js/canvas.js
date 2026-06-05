import "./state.js";

const CanvasEngine = (() => {
  let canvas, ctx, animationFrameId;
  let particles = [];
  let width, height;
  let currentStyle = "neural";
  let isRunning = false;
  const mouse = { x: null, y: null };

  const start = (canvasElement, style) => {
    stop();
    canvas = canvasElement;
    if (canvas) {
      ctx = canvas.getContext("2d");
      currentStyle = style || "neural";
      isRunning = true;
      resize();
      window.addEventListener("resize", resize, { passive: true });
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      render();
    }
  };

  const onMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const resize = () => {
    if (canvas) {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    }
  };

  const initParticles = () => {
    particles = [];
    const count = currentStyle === "rain" ? 150 : 100;
    const isNeural = currentStyle === "neural";
    const isRain = currentStyle === "rain";
    const isBubbles = currentStyle === "bubbles";

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isNeural ? 1.5 : 0.5),
        vy: isRain ? Math.random() * 5 + 3 : (Math.random() - 0.5) * 1.5,
        radius: isBubbles ? Math.random() * 15 + 2 : Math.random() * 2 + 1,
        opacity: isRain ? Math.random() * 0.5 + 0.5 : Math.random() * 0.5 + 0.2,
        color: isNeural ? "#7b61ff" : "rgba(255, 255, 255, 0.3)"
      });
    }
  };

  const render = () => {
    if (!canvas) return;
    ctx.clearRect(0, 0, width, height);

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#7b61ff";
    
    // Parse RGB values once per frame to avoid parsing inside the particle loop
    let rVal = 123, gVal = 97, bVal = 255;
    if (accentColor.startsWith("#")) {
      if (accentColor.length === 7) {
        rVal = parseInt(accentColor.slice(1, 3), 16);
        gVal = parseInt(accentColor.slice(3, 5), 16);
        bVal = parseInt(accentColor.slice(5, 7), 16);
      } else if (accentColor.length === 4) {
        rVal = parseInt(accentColor[1] + accentColor[1], 16);
        gVal = parseInt(accentColor[2] + accentColor[2], 16);
        bVal = parseInt(accentColor[3] + accentColor[3], 16);
      }
    } else if (accentColor.startsWith("rgb")) {
      const match = accentColor.match(/\d+/g);
      if (match) {
        rVal = parseInt(match[0]);
        gVal = parseInt(match[1]);
        bVal = parseInt(match[2]);
      }
    }

    const len = particles.length;

    if (currentStyle === "neural") {
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse interaction
        if (mouse.x !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 62500) { // 250px radius squared
            const force = (250 - Math.sqrt(distSq)) / 250;
            p.vx += dx * 0.003 * force;
            p.vy += dy * 0.003 * force;

            ctx.beginPath();
            ctx.shadowBlur = 10;
            ctx.shadowColor = accentColor;
            ctx.strokeStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${force * 0.3})`;
            ctx.lineWidth = 1.2;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw connections between nearby nodes
        for (let j = i + 1; j < len; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < 32400) { // 180px radius squared
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.strokeStyle = accentColor;
            ctx.globalAlpha = (180 - dist) / 720;
            ctx.lineWidth = 0.8;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    } else if (currentStyle === "bubbles") {
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.y -= p.vy;
        if (p.y < -50) p.y = height + 50;

        if (mouse.x !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          if (dx * dx + dy * dy < 22500) { // 150px squared
            p.x -= dx * 0.01;
            p.y -= dy * 0.01;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    } else if (currentStyle === "rain") {
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.y += p.vy;
        if (p.y > height) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        if (mouse.x !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          if (dx * dx + dy * dy < 6400) { // 80px squared
            p.y -= 5;
            p.vx += (Math.random() - 0.5) * 5;
          }
        }

        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx, p.y + 25);
        ctx.stroke();
      }
    }

    if (isRunning) {
      animationFrameId = requestAnimationFrame(render);
    }
  };

  const stop = () => {
    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    window.removeEventListener("resize", resize);
    window.removeEventListener("mousemove", onMouseMove);
    particles = [];
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  };

  return { init: start, stop };
})();

export { CanvasEngine };
