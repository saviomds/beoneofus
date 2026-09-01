"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ECOSYSTEM_NODES } from "../../../lib/visionData";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(callback) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(REDUCE_MOTION_QUERY);
  mq.addEventListener?.("change", callback);
  return () => mq.removeEventListener?.("change", callback);
}

// Client snapshot: motion is OK unless the user prefers reduced motion.
const getMotionSnapshot = () => !window.matchMedia?.(REDUCE_MOTION_QUERY).matches;
// Server snapshot: default to no animation until hydrated (matches prior initial render).
const getMotionServerSnapshot = () => false;

/**
 * EcosystemGraph — interactive network visualization.
 * Center = BeOneOfUs AI; orbiting nodes exchange animated data along edges.
 * Hovering/focusing a node highlights its relationship; keyboard accessible.
 */
export default function EcosystemGraph() {
  const [active, setActive] = useState(null);
  const motionOk = useSyncExternalStore(subscribeMotion, getMotionSnapshot, getMotionServerSnapshot);

  const S = 900, C = S / 2, R = 340;
  const nodes = useMemo(
    () => ECOSYSTEM_NODES.map((label, i) => {
      const ang = (i / ECOSYSTEM_NODES.length) * Math.PI * 2 - Math.PI / 2;
      return { label, i, x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) };
    }),
    [C, R]
  );

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full h-auto" role="img"
        aria-label="BeOneOfUs AI at the center of an ecosystem of institutions and opportunity domains">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#2563EB" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>

        {/* edges */}
        {nodes.map((n) => {
          const on = active === null || active === n.i;
          return (
            <line key={`e${n.i}`} x1={C} y1={C} x2={n.x} y2={n.y}
              stroke="url(#edge)" strokeWidth={active === n.i ? 2.4 : 1}
              strokeOpacity={on ? (active === n.i ? 0.9 : 0.28) : 0.08}
              style={{ transition: "stroke-opacity .3s, stroke-width .3s" }} />
          );
        })}

        {/* animated data pulses */}
        {motionOk && nodes.map((n) => (
          <circle key={`p${n.i}`} r="3.5" fill={active === n.i ? "#22D3EE" : "#7C3AED"}
            opacity={active === null || active === n.i ? 0.9 : 0.15}>
            <animateMotion dur={`${3 + (n.i % 5)}s`} repeatCount="indefinite"
              path={`M${C},${C} L${n.x},${n.y}`} />
          </circle>
        ))}

        {/* core glow */}
        <circle cx={C} cy={C} r="150" fill="url(#coreGlow)" />
        <circle cx={C} cy={C} r="66" fill="#0B1020" stroke="#7C3AED" strokeWidth="2" />
        <text x={C} y={C - 6} textAnchor="middle" className="fill-white" style={{ fontSize: 26, fontWeight: 900 }}>BeOneOfUs</text>
        <text x={C} y={C + 22} textAnchor="middle" fill="#22D3EE" style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>AI</text>

        {/* nodes */}
        {nodes.map((n) => {
          const on = active === null || active === n.i;
          return (
            <g key={`n${n.i}`}
              tabIndex={0} role="button" aria-label={n.label}
              onMouseEnter={() => setActive(n.i)} onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(n.i)} onBlur={() => setActive(null)}
              style={{ cursor: "pointer", outline: "none", transition: "opacity .3s", opacity: on ? 1 : 0.35 }}>
              <circle cx={n.x} cy={n.y} r={active === n.i ? 40 : 34}
                fill="#0B1020" stroke={active === n.i ? "#22D3EE" : "#3A2E7A"} strokeWidth="2"
                style={{ transition: "r .25s, stroke .25s" }} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" className="fill-white"
                style={{ fontSize: 15, fontWeight: 700, pointerEvents: "none" }}>{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
