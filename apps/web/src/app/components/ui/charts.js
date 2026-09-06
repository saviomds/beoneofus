'use client';

// ── BeOneOfUs 2.0 UI kit — chart primitives ───────────────────────────────
// Themed inline SVG. Method: dataviz skill (form → color-by-job → validate →
// marks → hover → a11y). Single-series charts use the brand hue (no adjacency
// concern, passes contrast both modes). Multi-series uses the skill's validated
// categorical order. Grid/axis/label wear text tokens, never a series colour.

import { useLayoutEffect, useRef, useState, useId } from 'react';
import { cn } from './cn';

/* Validated categorical order (dataviz skill reference palette). Light / dark
   steps are the same eight hues re-stepped for each surface. */
const CATEGORICAL = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#eb6834', dark: '#d95926' }, // orange
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
];
// Single-series = brand. brand-600 on light, brand-400 on dark.
const BRAND = { light: '#3a4de0', dark: '#6f80f6' };

function useDark() {
  const [dark, setDark] = useState(false);
  useLayoutEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function useMeasure() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const seriesColor = (i, dark) => {
  const c = CATEGORICAL[i % CATEGORICAL.length];
  return dark ? c.dark : c.light;
};

/* ── Tooltip shell ───────────────────────────────────────────────────────── */
function ChartTooltip({ x, y, children, w }) {
  if (x == null) return null;
  const flip = x > w * 0.62;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md border border-v2-hairline bg-v2-surface px-2.5 py-1.5 text-[12px] shadow-v2-raised whitespace-nowrap"
      style={{ left: x, top: y, transform: `translate(${flip ? '-100%' : '0'}, -50%)`, marginLeft: flip ? -8 : 8 }}
    >
      {children}
    </div>
  );
}

/* ── BarChart (categorical magnitude) ────────────────────────────────────── */
export function BarChart({
  data = [], height = 200, valueFormat = (v) => v, showValues = false,
  showGrid = true, color, className = '', ariaLabel = 'Bar chart',
}) {
  const dark = useDark();
  const [wrapRef, w] = useMeasure();
  const [hover, setHover] = useState(null);
  const padL = 8, padR = 8, padT = showValues ? 20 : 8, padB = 22;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = data.length ? innerW / data.length : 0;
  const barW = Math.min(46, Math.max(6, step * 0.6));
  const fill = color || (dark ? BRAND.dark : BRAND.light);
  const ticks = 3;

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} className="overflow-visible">
          {showGrid && Array.from({ length: ticks + 1 }).map((_, i) => {
            const y = padT + (innerH / ticks) * i;
            return (
              <g key={i}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--color-v2-hairline)" strokeWidth="1" />
                <text x={0} y={y} dy="0.32em" fontSize="10" fill="var(--color-v2-ink-faint)">
                  {valueFormat(Math.round(max - (max / ticks) * i))}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const h = Math.max(2, (d.value / max) * innerH);
            const x = padL + i * step + (step - barW) / 2;
            const y = padT + innerH - h;
            const active = hover?.i === i;
            return (
              <g key={i}>
                <rect
                  x={x} y={y} width={barW} height={h} rx="3"
                  fill={fill} opacity={hover && !active ? 0.45 : 1}
                  style={{ transition: 'opacity .12s' }}
                />
                {showValues && (
                  <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--color-v2-ink-muted)">
                    {valueFormat(d.value)}
                  </text>
                )}
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="10" fill="var(--color-v2-ink-faint)">
                  {d.label}
                </text>
                <rect
                  x={padL + i * step} y={padT} width={step} height={innerH} fill="transparent"
                  onMouseEnter={() => setHover({ i, x: x + barW / 2, y })}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hover && (
        <ChartTooltip x={hover.x} y={hover.y} w={w}>
          <span className="font-medium text-v2-ink">{data[hover.i].label}</span>
          <span className="ml-2 tabular-nums text-v2-ink-muted">{valueFormat(data[hover.i].value)}</span>
        </ChartTooltip>
      )}
    </div>
  );
}

/* ── LineChart (change over time) ───────────────────────────────────────── */
export function LineChart({
  series = [], height = 220, valueFormat = (v) => v, area = false,
  showGrid = true, className = '', ariaLabel = 'Line chart',
}) {
  const dark = useDark();
  const [wrapRef, w] = useMeasure();
  const gid = useId().replace(/[:]/g, '');
  const [hoverX, setHoverX] = useState(null);
  const norm = series.map((s) => ({ name: s.name, points: s.points || s.data || [] }));
  const allY = norm.flatMap((s) => s.points.map((p) => p.y ?? p.value ?? 0));
  const maxY = Math.max(...allY, 1);
  const len = Math.max(...norm.map((s) => s.points.length), 1);
  const padL = 4, padR = 4, padT = 10, padB = 22;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;
  const xAt = (i) => padL + (len <= 1 ? innerW / 2 : (innerW / (len - 1)) * i);
  const yAt = (v) => padT + innerH - (v / maxY) * innerH;
  const single = norm.length === 1;
  const ticks = 3;

  const hoverIdx = hoverX == null ? null : Math.round(((hoverX - padL) / innerW) * (len - 1));

  return (
    <div ref={wrapRef} className={cn('relative w-full', className)} style={{ height }}>
      {w > 0 && (
        <svg
          width={w} height={height} role="img" aria-label={ariaLabel}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHoverX(Math.max(padL, Math.min(w - padR, e.clientX - r.left)));
          }}
          onMouseLeave={() => setHoverX(null)}
        >
          {showGrid && Array.from({ length: ticks + 1 }).map((_, i) => {
            const y = padT + (innerH / ticks) * i;
            return <line key={i} x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--color-v2-hairline)" strokeWidth="1" />;
          })}
          {norm.map((s, si) => {
            const color = single ? (dark ? BRAND.dark : BRAND.light) : seriesColor(si, dark);
            const pts = s.points.map((p, i) => `${xAt(i)},${yAt(p.y ?? p.value ?? 0)}`).join(' ');
            const areaPts = `${padL},${padT + innerH} ${pts} ${xAt(s.points.length - 1)},${padT + innerH}`;
            return (
              <g key={si}>
                {area && (
                  <>
                    <defs>
                      <linearGradient id={`ln-${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon points={areaPts} fill={`url(#ln-${gid}-${si})`} />
                  </>
                )}
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
          {hoverIdx != null && hoverIdx >= 0 && hoverIdx < len && (
            <>
              <line x1={xAt(hoverIdx)} x2={xAt(hoverIdx)} y1={padT} y2={padT + innerH} stroke="var(--color-v2-hairline-2)" strokeWidth="1" />
              {norm.map((s, si) => {
                const p = s.points[hoverIdx];
                if (!p) return null;
                const color = single ? (dark ? BRAND.dark : BRAND.light) : seriesColor(si, dark);
                return <circle key={si} cx={xAt(hoverIdx)} cy={yAt(p.y ?? p.value ?? 0)} r="4" fill={color} stroke="var(--color-v2-surface)" strokeWidth="2" />;
              })}
            </>
          )}
          {norm[0]?.points.map((p, i) => (
            (i === 0 || i === len - 1 || len <= 7) && (
              <text key={i} x={xAt(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === len - 1 ? 'end' : 'middle'} fontSize="10" fill="var(--color-v2-ink-faint)">
                {p.x ?? p.label ?? ''}
              </text>
            )
          ))}
        </svg>
      )}
      {hoverIdx != null && hoverIdx >= 0 && hoverIdx < len && (
        <ChartTooltip x={xAt(hoverIdx)} y={padT + 4} w={w}>
          <div className="font-medium text-v2-ink">{norm[0].points[hoverIdx]?.x ?? norm[0].points[hoverIdx]?.label}</div>
          {norm.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5 tabular-nums text-v2-ink-muted">
              {!single && <span className="w-2 h-2 rounded-full" style={{ background: seriesColor(si, dark) }} />}
              {!single && <span>{s.name}:</span>}
              <span>{valueFormat(s.points[hoverIdx]?.y ?? s.points[hoverIdx]?.value ?? 0)}</span>
            </div>
          ))}
        </ChartTooltip>
      )}
      {!single && <ChartLegend items={norm.map((s, i) => ({ label: s.name, color: seriesColor(i, dark) }))} />}
    </div>
  );
}

/* ── Sparkline (bare trend, no axes/interaction) ─────────────────────────── */
export function Sparkline({ data = [], width = 96, height = 28, color, className = '' }) {
  const dark = useDark();
  const vals = data.map((d) => (typeof d === 'number' ? d : d.value ?? d.y ?? 0));
  if (vals.length < 2) return <span className={cn('inline-block', className)} style={{ width, height }} />;
  const max = Math.max(...vals), min = Math.min(...vals);
  const rng = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - ((v - min) / rng) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)} aria-hidden>
      <polyline points={pts} fill="none" stroke={color || (dark ? BRAND.dark : BRAND.light)} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── DonutChart (composition — use sparingly, ≤5 slices) ─────────────────── */
export function DonutChart({ data = [], size = 160, thickness = 18, centerLabel, centerValue, className = '' }) {
  const dark = useDark();
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  // Pre-compute the running start offset for each slice (no reassignment mid-render).
  const offsets = data.reduce((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (data[i - 1].value / total) * circ);
    return acc;
  }, []);
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((d, i) => {
            const dash = (d.value / total) * circ;
            return (
              <circle
                key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={seriesColor(i, dark)} strokeWidth={thickness}
                strokeDasharray={`${Math.max(0, dash - 2)} ${circ - dash + 2}`}
                strokeDashoffset={-offsets[i]}
                opacity={hover != null && hover !== i ? 0.4 : 1}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                style={{ transition: 'opacity .12s' }}
              />
            );
          })}
        </svg>
        {(centerValue != null || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue != null && <span className="text-lg font-semibold text-v2-ink tabular-nums">{centerValue}</span>}
            {centerLabel && <span className="text-[11px] text-v2-ink-faint">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ChartLegend
        vertical
        items={data.map((d, i) => ({
          label: d.label,
          color: seriesColor(i, dark),
          value: `${Math.round((d.value / total) * 100)}%`,
          active: hover === i,
        }))}
      />
    </div>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────────── */
export function ChartLegend({ items = [], vertical = false, className = '' }) {
  return (
    <ul className={cn('flex gap-x-4 gap-y-1 text-[12px]', vertical ? 'flex-col' : 'flex-wrap mt-2', className)}>
      {items.map((it, i) => (
        <li key={i} className={cn('flex items-center gap-1.5', it.active && 'font-medium')}>
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: it.color }} />
          <span className="text-v2-ink-muted">{it.label}</span>
          {it.value != null && <span className="ml-auto tabular-nums text-v2-ink-faint">{it.value}</span>}
        </li>
      ))}
    </ul>
  );
}
