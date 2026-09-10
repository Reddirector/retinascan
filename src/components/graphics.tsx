import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared stage colors                                                 */
/* ------------------------------------------------------------------ */

export const STAGE_COLORS = [
  "#10b981", // 0 emerald
  "#14b8a6", // 1 teal
  "#f59e0b", // 2 amber
  "#f97316", // 3 orange
  "#ef4444", // 4 red
];

/* ------------------------------------------------------------------ */
/* RetinaArt — synthetic fundus illustration                           */
/*                                                                     */
/* A deterministic SVG retina: orange-red fundus, optic disc, macula,  */
/* vascular arcades, and stage-appropriate lesions (microaneurysms,    */
/* hemorrhages, exudates, cotton-wool spots, neovascularization).      */
/* `attention` overlays a soft Grad-CAM-style heatmap wash.            */
/* ------------------------------------------------------------------ */

const MICROANEURYSMS: Array<[number, number]> = [
  [182, 122], [212, 186], [152, 96], [242, 112], [132, 192], [262, 200],
];
const HEMORRHAGES: Array<[number, number]> = [
  [226, 142], [172, 162], [262, 172], [122, 132], [192, 92], [236, 196],
];
const EXUDATES: Array<[number, number, number]> = [
  [202, 152, -12], [232, 126, 8], [166, 176, 20], [256, 152, -6],
];
const COTTON_WOOL: Array<[number, number]> = [[252, 106], [148, 206]];

export function RetinaArt({
  stage,
  attention = false,
  className,
}: {
  stage: number;
  attention?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const bgId = `bg-${uid}`;
  const attnId = `attn-${uid}`;

  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={`Synthetic fundus image, DR stage ${stage}`}
      className={cn("block rounded-[inherit]", className)}
    >
      <defs>
        <radialGradient id={bgId} cx="50%" cy="50%" r="72%">
          <stop offset="0%" stopColor="#f8c471" />
          <stop offset="55%" stopColor="#ef9a55" />
          <stop offset="100%" stopColor="#a85a30" />
        </radialGradient>
        <radialGradient id={attnId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#f97316" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Fundus background + rim */}
      <rect width="400" height="300" rx="14" fill={`url(#${bgId})`} />
      <rect width="400" height="300" rx="14" fill="none" stroke="#7c3a12" strokeOpacity="0.45" strokeWidth="8" />

      {/* Optic disc */}
      <ellipse cx="315" cy="150" rx="30" ry="26" fill="#f2d291" stroke="#c98a3e" strokeWidth="2" />
      <ellipse cx="315" cy="150" rx="11" ry="10" fill="#c98a3e" />

      {/* Macula + fovea */}
      <ellipse cx="135" cy="150" rx="26" ry="22" fill="#c96f3a" opacity="0.55" />
      <ellipse cx="135" cy="150" rx="9" ry="8" fill="#b3542e" />

      {/* Vascular arcades */}
      <g fill="none" strokeLinecap="round" opacity="0.85">
        {/* superior artery / vein */}
        <path d="M313 136 C 262 92, 212 92, 168 120" stroke="#d9604f" strokeWidth="3.5" />
        <path d="M310 130 C 256 82, 202 84, 150 116" stroke="#8f2f4f" strokeWidth="4.5" />
        {/* inferior artery / vein */}
        <path d="M313 164 C 262 208, 212 208, 168 180" stroke="#d9604f" strokeWidth="3.5" />
        <path d="M310 170 C 256 218, 202 216, 150 184" stroke="#8f2f4f" strokeWidth="4.5" />
        {/* nasal branches */}
        <path d="M342 140 C 362 134, 380 126, 394 118" stroke="#d9604f" strokeWidth="3" />
        <path d="M342 160 C 362 166, 380 174, 394 182" stroke="#8f2f4f" strokeWidth="3.5" />
        {/* arcade branches */}
        <path d="M240 96 C 226 86, 206 84, 188 92" stroke="#d9604f" strokeWidth="2" />
        <path d="M240 204 C 226 214, 206 216, 188 208" stroke="#8f2f4f" strokeWidth="2.2" />
        <path d="M206 108 C 196 118, 190 130, 188 142" stroke="#d9604f" strokeWidth="1.8" />
        <path d="M206 192 C 196 182, 190 170, 188 158" stroke="#8f2f4f" strokeWidth="2" />
      </g>

      {/* Stage 1+: microaneurysms */}
      {stage >= 1 && (
        <g fill="#ef4444">
          {MICROANEURYSMS.map(([x, y]) => (
            <circle key={`ma-${x}-${y}`} cx={x} cy={y} r="2" opacity="0.9" />
          ))}
        </g>
      )}

      {/* Stage 2+: hemorrhages + hard exudates */}
      {stage >= 2 && (
        <g>
          <g fill="#b91c1c" opacity="0.9">
            {HEMORRHAGES.map(([x, y]) => (
              <circle key={`he-${x}-${y}`} cx={x} cy={y} r="3.5" />
            ))}
          </g>
          <g fill="#fde047" opacity="0.85">
            {EXUDATES.map(([x, y, rot]) => (
              <ellipse key={`ex-${x}-${y}`} cx={x} cy={y} rx="7" ry="4.5" transform={`rotate(${rot} ${x} ${y})`} />
            ))}
          </g>
        </g>
      )}

      {/* Stage 3+: cotton-wool spots + venous beading */}
      {stage >= 3 && (
        <g>
          <g fill="#fef9c3" opacity="0.9">
            {COTTON_WOOL.map(([x, y]) => (
              <ellipse key={`cw-${x}-${y}`} cx={x} cy={y} rx="10" ry="6.5" />
            ))}
          </g>
          <path
            d="M310 130 C 268 98, 238 96, 204 118"
            fill="none" stroke="#8f2f4f" strokeWidth="7" opacity="0.9"
            strokeDasharray="11 4" strokeLinecap="round"
          />
        </g>
      )}

      {/* Stage 4: neovascularization + preretinal hemorrhage */}
      {stage >= 4 && (
        <g>
          <g stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.95">
            <path d="M312 146 L298 116" />
            <path d="M316 144 L330 112" />
            <path d="M308 152 L284 124" />
            <path d="M318 158 L340 186" />
            <path d="M310 162 L290 190" />
            <path d="M298 116 L290 102" />
            <path d="M330 112 L340 100" />
          </g>
          <circle cx="268" cy="128" r="10" fill="#7f1d1d" opacity="0.85" />
        </g>
      )}

      {/* Grad-CAM-style attention wash */}
      {attention && (
        <g className="anim-fade-slow">
          <circle cx="205" cy="150" r="62" fill={`url(#${attnId})`} filter={`url(#blur-${uid})`} />
          <circle cx="262" cy="168" r="40" fill={`url(#${attnId})`} filter={`url(#blur-${uid})`} />
          <circle cx="150" cy="120" r="34" fill={`url(#${attnId})`} filter={`url(#blur-${uid})`} />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline — tiny inline trend chart                                 */
/*                                                                     */
/* Color via className text-* (stroke + gradient fill use currentColor) */
/* ------------------------------------------------------------------ */

export function Sparkline({
  values,
  className,
  width = 110,
  height = 34,
}: {
  values: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const uid = useId().replace(/[:]/g, "");
  const fillId = `spark-${uid}`;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const px = 2;
  const pts = values.map((v, i) => {
    const x = px + (i * (width - px * 2)) / (values.length - 1);
    const y = height - 3 - ((v - min) / span) * (height - 8);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height} L${pts[0][0].toFixed(1)} ${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* GaugeRing — animated confidence donut                               */
/* ------------------------------------------------------------------ */

export function GaugeRing({
  value,
  size = 104,
  strokeWidth = 10,
  className,
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const uid = useId().replace(/[:]/g, "");
  const gradId = `gauge-${uid}`;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = mounted ? c * (1 - Math.min(100, Math.max(0, value)) / 100) : c;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProgressionChart — DR stage trajectory across screenings            */
/* ------------------------------------------------------------------ */

export function ProgressionChart({
  points,
  className,
}: {
  points: Array<{ label: string; stage: number }>;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const fillId = `prog-${uid}`;

  if (points.length < 2) return null;

  const W = 340;
  const H = 150;
  const pad = { l: 26, r: 14, t: 12, b: 24 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xFor = (i: number) => pad.l + (i * innerW) / (points.length - 1);
  const yFor = (stage: number) => pad.t + ((4 - stage) * innerH) / 4;

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)} ${yFor(p.stage).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xFor(points.length - 1).toFixed(1)} ${pad.t + innerH} L${pad.l} ${pad.t + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-auto w-full", className)} role="img" aria-label="DR stage progression chart">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y grid + stage labels */}
      {[0, 1, 2, 3, 4].map((s) => (
        <g key={`grid-${s}`}>
          <line x1={pad.l} x2={W - pad.r} y1={yFor(s)} y2={yFor(s)} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray={s === 0 || s === 4 ? undefined : "3 5"} />
          <text x={pad.l - 8} y={yFor(s) + 3} textAnchor="end" fontSize="9" fill="currentColor" className="text-muted-foreground">
            {s}
          </text>
        </g>
      ))}

      {/* Referable threshold */}
      <line x1={pad.l} x2={W - pad.r} y1={yFor(2)} y2={yFor(2)} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="5 4" opacity="0.7" />
      <text x={W - pad.r} y={yFor(2) - 5} textAnchor="end" fontSize="8.5" fill="#b45309" fontWeight="600">
        Referable threshold
      </text>

      {/* Area + line */}
      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} fill="none" stroke="#3b82f6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points + X labels */}
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`} className="anim-fade-slow" style={{ animationDelay: `${i * 90}ms` }}>
          <circle cx={xFor(i)} cy={yFor(p.stage)} r="5" fill={STAGE_COLORS[p.stage]} stroke="#fff" strokeWidth="2" />
          <text x={xFor(i)} y={H - 6} textAnchor="middle" fontSize="8.5" fill="currentColor" className="text-muted-foreground">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
