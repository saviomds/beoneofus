"use client";

import { useEffect, useRef } from "react";

/**
 * HeroNetwork — GPU-light animated node/particle network on <canvas>.
 * Flowing connection lines, soft glowing nodes, subtle mouse interaction.
 * Honors prefers-reduced-motion (renders a single static frame).
 */
export default function HeroNetwork({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;

    const COLORS = ["#2563EB", "#7C3AED", "#22D3EE"];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.floor((w * h) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.8,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const LINK = 130;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reduce) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          // gentle mouse pull
          const dx = mouse.x - n.x, dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 20000) { n.x += dx * 0.0009; n.y += dy * 0.0009; }
        }
        // links
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x, dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK) {
            const a = (1 - dist / LINK) * 0.5;
            ctx.strokeStyle = `rgba(124,110,245,${a})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
          }
        }
      }
      // glowing nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.c;
        ctx.shadowBlur = 10; ctx.shadowColor = n.c;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={`w-full h-full block ${className}`} />;
}
