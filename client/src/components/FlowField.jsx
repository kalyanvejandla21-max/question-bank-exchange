import React, { useEffect, useRef } from 'react';

export default function FlowField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = 0;
    let height = 0;
    let particles = [];
    let time = 0;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Colors for the organic flow field
    const colors = [
      { r: 14, g: 165, b: 233, a: 0.6 },  // Sky blue (#0ea5e9)
      { r: 6, g: 182, b: 212, a: 0.5 },   // Cyan (#06b6d4)
      { r: 99, g: 102, b: 241, a: 0.5 },  // Indigo (#6366f1)
      { r: 20, g: 184, b: 166, a: 0.5 },  // Teal (#14b8a6)
      { r: 245, g: 158, b: 11, a: 0.3 }   // Gold accent (#f59e0b)
    ];

    class Particle {
      constructor(w, h) {
        this.reset(w, h);
      }

      reset(w, h) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.speed = 0.4 + Math.random() * 0.8;
        this.radius = 1.2 + Math.random() * 1.8;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.life = 0;
        this.maxLife = 180 + Math.random() * 240;
        this.history = [];
        this.maxHistory = 8;
      }

      update(w, h, timeStep) {
        // Flow field noise math using sine/cosine harmonics
        const scaleX = 0.0025;
        const scaleY = 0.0025;
        const angle = 
          Math.sin(this.x * scaleX + timeStep) * Math.cos(this.y * scaleY + timeStep) * Math.PI * 2 +
          Math.sin((this.x + this.y) * 0.001) * Math.PI;

        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
        this.life++;

        // Wrap or reset
        if (this.x < 0 || this.x > w || this.y < 0 || this.y > h || this.life >= this.maxLife) {
          this.reset(w, h);
        }
      }

      draw(context) {
        const opacityRatio = Math.sin((this.life / this.maxLife) * Math.PI);
        const currentAlpha = this.color.a * opacityRatio;

        if (this.history.length > 1) {
          context.beginPath();
          context.moveTo(this.history[0].x, this.history[0].y);
          for (let i = 1; i < this.history.length; i++) {
            context.lineTo(this.history[i].x, this.history[i].y);
          }
          context.strokeStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${currentAlpha * 0.5})`;
          context.lineWidth = this.radius * 0.8;
          context.lineCap = 'round';
          context.stroke();
        }

        // Draw particle head glow
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${currentAlpha})`;
        context.shadowBlur = 8;
        context.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.8)`;
        context.fill();
        context.shadowBlur = 0;
      }
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      // Fix canvas scaling transform
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Responsive particle density
      const isMobile = width < 768;
      const targetCount = isMobile ? 22 : 55;

      particles = [];
      for (let i = 0; i < targetCount; i++) {
        particles.push(new Particle(width, height));
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Render loop
    const render = () => {
      time += 0.004;

      // Subtle translucent clear for trail effect
      ctx.fillStyle = 'rgba(11, 15, 23, 0.18)';
      ctx.fillRect(0, 0, width, height);

      particles.forEach((p) => {
        p.update(width, height, time);
        p.draw(ctx);
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // If reduced motion is enabled, draw single static background frame once
    if (prefersReducedMotion) {
      ctx.fillStyle = '#0b0f17';
      ctx.fillRect(0, 0, width, height);
      particles.forEach((p) => p.draw(ctx));
    } else {
      animationFrameId = requestAnimationFrame(render);
    }

    // Pause animation when window/tab is hidden to save GPU/CPU
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelAnimationFrame(animationFrameId);
      } else if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 w-full h-full opacity-70"
    />
  );
}
