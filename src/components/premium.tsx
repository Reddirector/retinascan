import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* CountUp — smooth 0→value counter for stats and confidence scores    */
/* ------------------------------------------------------------------ */

export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  duration = 900,
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip — lightweight hover tooltip explaining technical metrics    */
/* ------------------------------------------------------------------ */

export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background opacity-0 shadow-lg transition-all duration-200",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top"
            ? "bottom-full mb-1.5 translate-y-1 group-hover/tt:translate-y-0"
            : "top-full mt-1.5 -translate-y-1 group-hover/tt:translate-y-0",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* HealthDot — animated live status indicator for AI services          */
/* ------------------------------------------------------------------ */

export function HealthDot({
  tone = "ok",
  label,
  className,
}: {
  tone?: "ok" | "warn" | "down";
  label?: string;
  className?: string;
}) {
  const color =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <span className={cn("relative inline-flex size-2.5", className)} title={label}>
      <span className={cn("absolute inline-flex size-full rounded-full anim-ping-soft", color)} />
      <span className={cn("relative inline-flex size-2.5 rounded-full", color)} />
    </span>
  );
}

export function ServiceHealth({ compact = false }: { compact?: boolean }) {
  const services = [
    { name: "Vision Model", detail: "effnet-b0-dr · inference online" },
    { name: "SGLang", detail: "runtime serving 3 models" },
    { name: "RAG", detail: "hybrid retrieval · reranker active" },
    { name: "ChromaDB", detail: "96,412 vectors indexed" },
    { name: "Supabase", detail: "database · 12ms p50 latency" },
    { name: "API", detail: "gateway · 0 errors last hour" },
  ];
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        {services.map((s) => (
          <Tooltip key={s.name} label={`${s.name} — ${s.detail}`}>
            <span className="cursor-default">
              <HealthDot />
            </span>
          </Tooltip>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {services.map((s) => (
        <Tooltip key={s.name} label={s.detail}>
          <span className="inline-flex cursor-default items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <HealthDot />
            {s.name}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VerifyCheck — pop-in check when a stage completes                   */
/* ------------------------------------------------------------------ */

export function VerifyCheck({ className }: { className?: string }) {
  return (
    <span className={cn("anim-verify inline-flex", className)}>
      <svg viewBox="0 0 24 24" className="size-full" fill="none">
        <circle cx="12" cy="12" r="10" className="fill-emerald-100" />
        <path
          d="M7.5 12.5l3 3 6-6.5"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-emerald-600 anim-strike"
        />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* TypingDots — AI processing indicator                                */
/* ------------------------------------------------------------------ */

export function TypingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-blue-500"
          style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton — shimmer loading placeholder                              */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("anim-shimmer rounded-lg bg-muted", className)} />
  );
}

/* ------------------------------------------------------------------ */
/* AIProcessing — elegant orbital processing animation                 */
/* ------------------------------------------------------------------ */

export function AIProcessing({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="relative size-14">
        <span className="absolute inset-0 rounded-full border border-blue-200/70" />
        <span className="absolute inset-0 rounded-full border-t-2 border-blue-500 anim-orbit" />
        <span className="absolute inset-2 rounded-full border-t-2 border-teal-400/80 anim-orbit" style={{ animationDirection: "reverse", animationDuration: "1.8s" }} />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="size-2.5 rounded-full bg-blue-500 anim-breathe" />
        </span>
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProgressBar — animated determinate bar                              */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-blue-500 transition-[width] duration-700 ease-out",
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SeverityBar — interactive DR probability bar                        */
/* ------------------------------------------------------------------ */

export function SeverityBar({
  name,
  pct,
  active,
  delay = 0,
  barClassName,
  valueClassName,
}: {
  name: string;
  pct: number;
  active: boolean;
  delay?: number;
  /** Optional per-stage bar color (overrides default active gradient). */
  barClassName?: string;
  /** Optional per-stage value text color. */
  valueClassName?: string;
}) {
  return (
    <div className="group/sev flex items-center gap-3">
      <span
        className={cn(
          "w-32 shrink-0 text-xs transition-colors",
          active ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {name}
      </span>
      <Tooltip label={`${name}: ${pct}% model probability`}>
        <div className="h-2.5 flex-1 cursor-default overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out group-hover/sev:brightness-110",
              active
                ? (barClassName ?? "bg-gradient-to-r from-blue-500 to-teal-400")
                : "bg-slate-300",
            )}
            style={{
              width: `${Math.max(pct, 0.8)}%`,
              transitionDelay: `${delay}ms`,
            }}
          />
        </div>
      </Tooltip>
      <span
        className={cn(
          "nb-mono w-14 text-right text-xs tabular-nums",
          active ? (valueClassName ?? "font-semibold text-blue-600") : "text-muted-foreground",
        )}
      >
        <CountUp value={pct} decimals={pct % 1 === 0 ? 0 : 1} suffix="%" duration={700} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState — professional empty/error presentation                  */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel anim-rise p-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VerifiedBadge — "Verified by RetinaScan AI" trust badge             */
/* ------------------------------------------------------------------ */

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700",
        className,
      )}
    >
      <span className="relative flex size-3.5 items-center justify-center rounded-full bg-emerald-500">
        <Check className="size-2.5 text-white" strokeWidth={3.5} />
      </span>
      Verified by RetinaScan AI
    </span>
  );
}
