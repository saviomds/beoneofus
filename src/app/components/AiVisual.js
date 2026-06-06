"use client";

/**
 * AiVisual — Dynamic AI orb animation that responds to conversation tone.
 *
 * Usage:
 *   import AiVisual, { analyzeTone } from "@/app/components/AiVisual";
 *   <AiVisual phase="speaking" tone="energetic" size={128} />
 *
 * phase : "idle" | "listening" | "processing" | "speaking"
 * tone  : "calm" | "neutral" | "energetic" | "excited"
 * size  : number  (canvas buffer & display px, default 128)
 *
 * Embeddable: zero external deps beyond React. Drop the file anywhere,
 * swap the import path. Works in any React 18+ or Next.js project.
 */

import { useRef, useEffect } from "react";

/* ─────────────────────────────────────────────────────────────────
   Tone detection — classify an AI reply for visual intensity
───────────────────────────────────────────────────────────────── */
export function analyzeTone(text) {
  if (!text || text.length < 8) return "neutral";

  const exclamations = (text.match(/!/g) || []).length;

  const energy = (text.match(
    /\b(amazing|great|fantastic|excellent|perfect|awesome|brilliant|wonderful|incredible|outstanding|superb|exciting|thrilled|love|congratulations|well done|exactly|absolutely|definitely|nailed it)\b/gi
  ) || []).length;

  const calm = (text.match(
    /\b(gently|slowly|simply|careful|note that|remember|consider|however|although|while|basically|essentially|typically|usually|generally|importantly|keep in mind)\b/gi
  ) || []).length;

  const technical = (text.match(
    /\b(function|class|interface|algorithm|async|await|const|return|import|export|implement|configure|install|database|api|server|component|module|package|variable|boolean|string|array|object)\b/gi
  ) || []).length;

  const score = energy + exclamations * 1.5;

  if (score >= 3)                          return "excited";
  if (score >= 1)                          return "energetic";
  if (calm >= 3 || technical >= 5)         return "calm";
  return "neutral";
}

/* ─────────────────────────────────────────────────────────────────
   Phase palettes  [hue°, saturation%, lightness%]
───────────────────────────────────────────────────────────────── */
const PALETTE = {
  idle:       [220, 78, 60],
  listening:  [152, 72, 57],
  processing: [262, 68, 64],
  speaking:   [210, 86, 64],
};

/* Tone animation config */
const T = {
  speed:   { calm: 0.50, neutral: 1.00, energetic: 1.80, excited: 2.70 },
  rings:   { calm: 1,    neutral: 2,    energetic: 3,    excited: 4    },
  glow:    { calm: 0.07, neutral: 0.12, energetic: 0.20, excited: 0.28 },
  parts:   { calm: 6,    neutral: 11,   energetic: 18,   excited: 26   },
};
const MAX_PARTICLES = T.parts.excited;

/* ─────────────────────────────────────────────────────────────────
   AiVisual component
───────────────────────────────────────────────────────────────── */
export default function AiVisual({ phase = "idle", tone = "neutral", size = 128, className = "" }) {
  const canvasRef = useRef(null);

  /* Live animation state — never triggers re-renders */
  const S = useRef({
    phase,
    tone,
    speed:  T.speed[tone] || 1,
    target: T.speed[tone] || 1,
    parts:  [],
  });

  /* Sync props → ref every render (rAF loop reads from ref, not props) */
  S.current.phase  = phase;
  S.current.tone   = tone;
  S.current.target = T.speed[tone] || 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    /* Particle pool (max for excited; idle uses fewer) */
    S.current.parts = Array.from({ length: MAX_PARTICLES }, (_, i) => ({
      a:   (i / MAX_PARTICLES) * Math.PI * 2 + Math.random() * 0.4,
      r:   size * 0.35 + Math.random() * size * 0.10,
      spd: 0.0030 + Math.random() * 0.0040,
      sz:  0.7 + Math.random() * 1.5,
      phi: Math.random() * Math.PI * 2,
    }));

    let rafId;
    let t0 = null;

    const draw = (ts) => {
      if (!t0) t0 = ts;
      const t  = (ts - t0) * 0.001;
      const st = S.current;

      /* Smooth speed interpolation on tone change */
      st.speed += (st.target - st.speed) * 0.035;
      const spd = st.speed;

      const [h, s, l] = PALETTE[st.phase] || PALETTE.idle;
      const isIdle    = st.phase === "idle";
      const ringCount = isIdle ? 1 : (T.rings[st.tone] || 2);
      const glowStr   = isIdle ? 0.06 : (T.glow[st.tone] || 0.12);
      const cx = size / 2, cy = size / 2;
      const R  = size * 0.30;

      ctx.clearRect(0, 0, size, size);

      /* ── 1. Expanding pulse rings ── */
      for (let i = 0; i < ringCount; i++) {
        const rp  = ((t * spd * 0.42 + i / ringCount) % 1);
        const rR  = R * (1.06 + rp * 1.18);
        const ra  = (1 - rp) * (isIdle ? 0.05 : 0.18 * Math.min(spd, 2.2));
        ctx.beginPath();
        ctx.arc(cx, cy, rR, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${h},${s}%,${l}%,${ra})`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      /* ── 2. Ambient glow halo ── */
      const breathe = 1 + (Math.sin(t * spd * 1.65) * 0.5 + 0.5) * 0.07;
      const glowR   = R * (1.55 + breathe * 0.28);
      const grd     = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, glowR);
      grd.addColorStop(0, `hsla(${h},${s}%,${l}%,${glowStr * 1.9})`);
      grd.addColorStop(1, `hsla(${h},${s}%,${l}%,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      /* ── 3. Main orb sphere ── */
      const oR  = R * breathe;
      const ll  = Math.min(l + 20, 91);
      const orb = ctx.createRadialGradient(
        cx - oR * 0.28, cy - oR * 0.30, oR * 0.04,
        cx, cy, oR
      );
      orb.addColorStop(0,   `hsla(${h - 4},${s - 8}%,${ll}%,1)`);
      orb.addColorStop(0.42, `hsla(${h},${s}%,${l}%,0.96)`);
      orb.addColorStop(1,   `hsla(${h + 5},${s + 3}%,${l - 15}%,0.91)`);
      ctx.beginPath();
      ctx.arc(cx, cy, oR, 0, Math.PI * 2);
      ctx.fillStyle = orb;
      ctx.fill();

      /* Inner shimmer highlight */
      const shine = ctx.createRadialGradient(
        cx - oR * 0.25, cy - oR * 0.35, 0,
        cx - oR * 0.25, cy - oR * 0.35, oR * 0.45
      );
      shine.addColorStop(0, `hsla(0,0%,100%,${0.18 + breathe * 0.04})`);
      shine.addColorStop(1, `hsla(0,0%,100%,0)`);
      ctx.beginPath();
      ctx.arc(cx, cy, oR, 0, Math.PI * 2);
      ctx.fillStyle = shine;
      ctx.fill();

      /* ── 4. Processing spinner arc ── */
      if (st.phase === "processing") {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 2.5);
        const spinG = ctx.createLinearGradient(-R, 0, R, 0);
        spinG.addColorStop(0,   `hsla(${h},${s}%,${l}%,0)`);
        spinG.addColorStop(0.55,`hsla(${h},${s}%,${l}%,0.55)`);
        spinG.addColorStop(1,   `hsla(${h},${s}%,${l}%,0.9)`);
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.26, 0, Math.PI * 1.45);
        ctx.strokeStyle = spinG;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = "round";
        ctx.stroke();
        ctx.restore();
      }

      /* Listening inner wave */
      if (st.phase === "listening") {
        const wAmp = 2.5 * spd;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.05) {
          const wr = oR * (0.75 + Math.sin(a * 5 + t * spd * 3) * 0.04 * wAmp);
          const wx = cx + Math.cos(a) * wr;
          const wy = cy + Math.sin(a) * wr;
          a === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.strokeStyle = `hsla(${h},${s}%,${ll}%,0.4)`;
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();
      }

      /* ── 5. Orbital particles ── */
      const activeParts = isIdle ? 4 : (T.parts[st.tone] || 11);
      const pAlpha      = isIdle ? 0.14 : 0.52;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p    = st.parts[i];
        const fade = Math.max(0, Math.min(1, activeParts - i));
        if (fade <= 0) continue;
        p.a += p.spd * spd;
        const dist = p.r * (1 + Math.sin(t * spd * 1.1 + p.phi) * 0.055);
        const px   = cx + Math.cos(p.a) * dist;
        const py   = cy + Math.sin(p.a) * dist;
        const pa   = Math.abs(Math.sin(t * spd * 0.82 + p.phi)) * pAlpha * fade;
        const psz  = p.sz * (0.6 + spd * 0.22);
        ctx.beginPath();
        ctx.arc(px, py, psz, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h},${s}%,${l + 20}%,${pa})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [size]); // Only reinit canvas when size changes; props go through S ref

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={`rounded-full ${className}`}
    />
  );
}
