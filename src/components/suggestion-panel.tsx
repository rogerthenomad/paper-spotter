import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, PenLine, ScanSearch, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { runForensicPass } from "@/lib/spotter/forensic";
import { rewritePassages } from "@/lib/spotter/rewrite";
import { useSpotterStore } from "@/lib/spotter/store";
import type { Label, ScanReport, Suggestion, SuggestionSeverity } from "@/lib/spotter/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScoreRing } from "./score-ring";
import { cn } from "@/lib/utils";

const LABEL_TONE: Record<Label, "human" | "mixed" | "ai" | "default"> = {
  human: "human",
  mixed: "mixed",
  ai: "ai",
  unavailable: "default",
  error: "ai",
};

const SEV_TONE: Record<SuggestionSeverity, "ai" | "mixed" | "default"> = {
  high: "ai",
  med: "mixed",
  low: "default",
};

function labelCopy(label: Label): string {
  if (label === "human") return "Human-like";
  if (label === "mixed") return "Mixed / hybrid";
  if (label === "ai") return "Machine-like";
  return "Unscored";
}

export function SuggestionPanel({
  scan,
  activeId,
  onSelect,
}: {
  scan: ScanReport;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const open = (scan.suggestions ?? []).filter((s) => s.status === "open");
  const human = Math.round((1 - scan.ensembleAiScore) * 100);

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-4">
          <ScoreRing
            score={1 - scan.ensembleAiScore}
            label={scan.ensembleLabel}
            size={108}
            caption="Voice"
          />
          <div className="min-w-0">
            <div className="font-display text-3xl tabular-nums leading-none">{open.length}</div>
            <p className="mt-1 text-sm text-muted">
              {open.length === 1 ? "recommendation" : "recommendations"}
            </p>
            <p className="mt-2 text-xs text-subtle">
              {human}% human-like · {scan.wordCount.toLocaleString()} words
            </p>
            <Badge className="mt-2" tone={LABEL_TONE[scan.ensembleLabel]}>
              {labelCopy(scan.ensembleLabel)}
            </Badge>
          </div>
        </div>
        {scan.warnings.map((w) => (
          <p key={w} className="mt-3 text-xs text-mixed">
            {w}
          </p>
        ))}
      </div>

      <RewriteBar scan={scan} open={open} />

      {open.length === 0 ? (
        <div className="rounded-xl bg-surface px-4 py-6 text-sm text-muted shadow-[var(--shadow-border)]">
          No open flags. The remaining prose looks closer to a human scholar — or the excerpt is
          too short to judge.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {open.map((s) => (
            <li key={s.id}>
              <SuggestionCard
                suggestion={s}
                scanId={scan.id}
                active={activeId === s.id}
                onSelect={() => onSelect(s.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <EngineStrip scan={scan} />
      <ForensicBlock scan={scan} />
    </aside>
  );
}

function RewriteBar({ scan, open }: { scan: ScanReport; open: Suggestion[] }) {
  const attachRewrites = useSpotterStore((s) => s.attachRewrites);
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async () =>
      rewritePassages({
        data: {
          passages: open.slice(0, 8).map((s) => ({
            id: s.id,
            excerpt: s.excerpt,
            issue: s.issue,
          })),
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      attachRewrites(scan.id, res.rewrites);
      setErr(null);
    },
    onError: () => setErr("Rewrite pass failed."),
  });

  if (open.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="solid"
        className="w-full"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? <Loader2 className="animate-spin" /> : <PenLine className="size-4" />}
        Rewrite with Grok
      </Button>
      <p className="text-xs text-subtle">
        Local fixes are already in each card. Grok rewrites the open passages in a human scholarly
        voice — spends your xAI quota.
      </p>
      {err ? <p className="text-sm text-machine">{err}</p> : null}
    </div>
  );
}

function SuggestionCard({
  suggestion: s,
  scanId,
  active,
  onSelect,
}: {
  suggestion: Suggestion;
  scanId: string;
  active: boolean;
  onSelect: () => void;
}) {
  const accept = useSpotterStore((st) => st.acceptSuggestion);
  const dismiss = useSpotterStore((st) => st.dismissSuggestion);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [active]);

  const isDelete = s.rewrite.length === 0;

  return (
    <article
      ref={ref}
      id={`card-${s.id}`}
      className={cn(
        "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)]",
        active && "shadow-[var(--shadow-border-hover)] ring-1 ring-accent/40",
      )}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <Badge tone={SEV_TONE[s.severity]}>{s.severity}</Badge>
          <h3 className="text-sm font-medium">{s.title}</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{s.issue}</p>
        <p className="mt-2 text-sm text-fg">{s.recommendation}</p>
      </button>
      <blockquote className="mt-3 rounded-lg bg-inset px-3 py-2 text-sm leading-relaxed text-muted">
        {s.excerpt}
      </blockquote>
      <div className="mt-2 rounded-lg bg-inset px-3 py-2 text-sm leading-relaxed">
        <div className="text-[11px] uppercase tracking-wider text-subtle">
          {isDelete ? "Remove" : "Try"}
        </div>
        <p className="mt-1 text-fg">
          {isDelete ? "Delete this sentence — it carries no claim." : s.rewrite}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="solid" onClick={() => accept(scanId, s.id)}>
          <Check className="size-4" />
          {isDelete ? "Remove" : "Accept"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(scanId, s.id)}>
          <X className="size-4" />
          Dismiss
        </Button>
      </div>
    </article>
  );
}

function EngineStrip({ scan }: { scan: ScanReport }) {
  return (
    <details className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <summary className="cursor-pointer text-sm font-medium">How it was scored</summary>
      <ul className="mt-3 flex flex-col gap-2">
        {scan.results.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 truncate text-muted">{r.name.split(" / ")[0]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-inset">
              <div
                className={cn(
                  "h-full rounded-full",
                  r.label === "ai" && "bg-machine",
                  r.label === "mixed" && "bg-mixed",
                  r.label === "human" && "bg-human",
                )}
                style={{ width: `${Math.round((r.aiScore ?? 0) * 100)}%` }}
              />
            </div>
            <span className="w-8 text-right font-mono tabular-nums">
              {Math.round((r.aiScore ?? 0) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ForensicBlock({ scan }: { scan: ScanReport }) {
  const attach = useSpotterStore((s) => s.attachForensic);
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async () =>
      runForensicPass({
        data: {
          title: scan.title,
          excerpt: scan.text.slice(0, 7000),
          stats: scan.results.map((r) => `${r.id}:${((r.aiScore ?? 0) * 100).toFixed(0)}`).join(","),
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      attach(scan.id, res.report);
      setErr(null);
    },
    onError: () => setErr("Committee read failed."),
  });

  const f = scan.forensic;

  return (
    <details className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]" open={!!f}>
      <summary className="cursor-pointer text-sm font-medium">Faculty verdict</summary>
      <p className="mt-2 text-xs text-subtle">
        Optional Grok 4.5 close-read. Not required for the inline recommendations.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? <Loader2 className="animate-spin" /> : <ScanSearch className="size-4" />}
        {f ? "Re-run" : "Committee read"}
      </Button>
      {err ? <p className="mt-2 text-sm text-machine">{err}</p> : null}
      {f ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm leading-relaxed">{f.verdict}</p>
          <Badge tone={LABEL_TONE[f.label]}>{labelCopy(f.label)}</Badge>
        </div>
      ) : null}
    </details>
  );
}
