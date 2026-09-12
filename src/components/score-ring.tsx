import type { Label } from "@/lib/spotter/types";
import { cn } from "@/lib/utils";

const TONE: Record<Label, string> = {
  human: "stroke-human",
  mixed: "stroke-mixed",
  ai: "stroke-machine",
  unavailable: "stroke-muted",
  error: "stroke-machine",
};

export function ScoreRing({
  score,
  label,
  size = 168,
  caption = "AI mass",
}: {
  score: number;
  label: Label;
  size?: number;
  caption?: string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, score));
  const dash = c * pct;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="70" cy="70" r={r} className="stroke-border" strokeWidth="8" fill="none" />
        <circle
          cx="70"
          cy="70"
          r={r}
          className={cn(TONE[label], "transition-[stroke-dasharray] duration-[var(--motion-slow)]")}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono tabular-nums tracking-tight",
            size < 140 ? "text-2xl" : "text-4xl",
          )}
        >
          {Math.round(pct * 100)}
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{caption}</span>
      </div>
    </div>
  );
}
