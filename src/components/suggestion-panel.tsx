import { useMutation } from "@tanstack/react-query";
import { Check, Loader2, PenLine, ScanSearch, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SourceDesk } from "./source-desk";
import { runForensicPass } from "@/lib/spotter/forensic";
import { rewritePassages } from "@/lib/spotter/rewrite";
import { extractOsint } from "@/lib/spotter/osint";
import { useSpotterStore } from "@/lib/spotter/store";
import type {
  EvidenceLevel,
  Label,
  ScanReport,
  Suggestion,
  SuggestionKind,
  SuggestionSeverity,
} from "@/lib/spotter/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type Tab = "sentences" | "words" | "paragraphs" | "sources";

const SENTENCE_KINDS = new Set<SuggestionKind>([
  "cliche",
  "cadence",
  "hollow",
  "citation",
  "punctuation",
  "artifact",
]);

const LABEL_TONE: Record<Label, "human" | "mixed" | "ai" | "default"> = {
  human: "human",
  mixed: "mixed",
  ai: "ai",
  unavailable: "default",
  error: "ai",
};

const EV_TONE: Record<EvidenceLevel, "human" | "mixed" | "ai" | "default"> = {
  human: "human",
  hybrid: "mixed",
  uncertain: "default",
  insufficient: "default",
  machine: "ai",
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

function evidenceCopy(level: EvidenceLevel): string {
  if (level === "human") return "Human-like";
  if (level === "hybrid") return "Mixed chapter";
  if (level === "machine") return "Machine-like";
  if (level === "insufficient") return "Too short";
  return "Uncertain";
}

function inTab(s: Suggestion, tab: Tab): boolean {
  if (tab === "words") return s.kind === "word";
  if (tab === "paragraphs") return s.kind === "paragraph";
  if (tab === "sources") return false;
  return SENTENCE_KINDS.has(s.kind);
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
  const [tab, setTab] = useState<Tab>("sentences");
  const open = (scan.suggestions ?? []).filter((s) => s.status === "open");
  useEffect(() => {
    const hit = open.find((s) => s.id === activeId);
    if (!hit) return;
    if (hit.kind === "word") setTab("words");
    else if (hit.kind === "paragraph") setTab("paragraphs");
    else setTab("sentences");
  }, [activeId]);
  const shown = open.filter((s) => inTab(s, tab));
  const mix = scan.mix ?? { ai: 0, mixed: 0, human: 100 };
  const ev = scan.evidence;
  const sourceN = useMemo(() => extractOsint(scan.text).length, [scan.text]);
  const counts = useMemo(
    () => ({
      sentences: open.filter((s) => SENTENCE_KINDS.has(s.kind)).length,
      words: open.filter((s) => s.kind === "word").length,
      paragraphs: open.filter((s) => s.kind === "paragraph").length,
      sources: sourceN,
    }),
    [open, sourceN],
  );

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge tone={EV_TONE[ev?.level ?? "uncertain"]}>
            {evidenceCopy(ev?.level ?? "uncertain")}
          </Badge>
          <span className="text-xs tabular-nums text-subtle">{scan.wordCount.toLocaleString()} words</span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted">{ev?.summary}</p>
        <div className="mt-2 grid grid-cols-3 gap-1 sm:hidden">
          <MiniMix label="AI" value={mix.ai} tone="ai" />
          <MiniMix label="Mix" value={mix.mixed} tone="mixed" />
          <MiniMix label="Human" value={mix.human} tone="human" />
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-0.5 border-b border-border bg-surface p-1">
        {(
          [
            ["sentences", "Sentences", counts.sentences],
            ["words", "Words", counts.words],
            ["paragraphs", "Paragraphs", counts.paragraphs],
            ["sources", "Sources", counts.sources],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-md px-1 py-1.5 text-center text-[11px] transition-colors duration-[var(--motion-quick)]",
              tab === id ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            <div className="font-medium">{label}</div>
            <div className="tabular-nums text-subtle">{n}</div>
          </button>
        ))}
      </div>

      {tab !== "sources" ? (
        <div className="shrink-0 px-3 py-2">
          <RewriteBar scan={scan} open={shown} tab={tab} />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {tab === "sources" ? (
          <SourceDesk scan={scan} />
        ) : shown.length === 0 ? (
          <div className="rounded-lg bg-surface px-3 py-5 text-sm text-muted shadow-[var(--shadow-border)]">
            {tab === "words"
              ? "No generator vocab left to swap."
              : tab === "paragraphs"
                ? "No paragraph-sized machine patches."
                : "No open sentence flags."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {shown.map((s) => (
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

        <div className="mt-3 flex flex-col gap-2 pb-4">
          <EngineStrip scan={scan} />
          <ForensicBlock scan={scan} />
        </div>
      </div>
    </aside>
  );
}

function MiniMix({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ai" | "mixed" | "human";
}) {
  return (
    <div
      className={cn(
        "rounded-md px-1.5 py-1 text-center",
        tone === "ai" && "bg-machine/15 text-machine",
        tone === "mixed" && "bg-mixed/15 text-mixed",
        tone === "human" && "bg-human/15 text-human",
      )}
    >
      <div className="font-display text-base tabular-nums leading-none">{value}%</div>
      <div className="text-[9px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function RewriteBar({ scan, open, tab }: { scan: ScanReport; open: Suggestion[]; tab: Tab }) {
  const attachRewrites = useSpotterStore((s) => s.attachRewrites);
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async () =>
      rewritePassages({
        data: {
          passages: open
            .filter((s) => s.kind !== "artifact" && s.kind !== "word")
            .slice(0, 6)
            .map((s) => ({
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

  if (tab === "words" || tab === "sources" || open.length === 0) return null;

  return (
    <div>
      <Button
        type="button"
        variant="solid"
        size="sm"
        className="w-full"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? <Loader2 className="animate-spin" /> : <PenLine className="size-4" />}
        {tab === "paragraphs" ? "Rewrite paragraphs" : "Rewrite sentences"}
      </Button>
      {err ? <p className="mt-1 text-xs text-machine">{err}</p> : null}
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
  const isClean = s.kind === "artifact";
  const isWord = s.kind === "word";
  const alts = s.alternatives ?? [];
  const showTry = !isClean && !isWord && s.rewrite !== s.excerpt;

  return (
    <article
      ref={ref}
      id={`card-${s.id}`}
      className={cn(
        "rounded-lg bg-surface p-3 shadow-[var(--shadow-border)]",
        active && "ring-1 ring-accent/40",
      )}
    >
      <button type="button" className="w-full text-left" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <Badge tone={SEV_TONE[s.severity]}>{s.severity}</Badge>
          <h3 className="text-sm font-medium">{s.title}</h3>
        </div>
        <p className="mt-1.5 text-sm leading-snug text-muted">{s.recommendation}</p>
      </button>
      {s.kind !== "artifact" ? (
        <blockquote className="mt-2 max-h-24 overflow-y-auto rounded-md bg-inset px-2.5 py-1.5 text-xs leading-relaxed text-muted">
          {s.excerpt}
        </blockquote>
      ) : null}
      {isWord ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="solid" onClick={() => accept(scanId, s.id, s.rewrite)}>
            <Check className="size-4" />
            {s.rewrite}
          </Button>
          {alts.map((a) => (
            <Button key={a} type="button" size="sm" variant="secondary" onClick={() => accept(scanId, s.id, a)}>
              {a}
            </Button>
          ))}
        </div>
      ) : null}
      {showTry || isDelete ? (
        <div className="mt-2 rounded-md bg-inset px-2.5 py-1.5 text-xs leading-relaxed">
          <div className="text-[10px] uppercase tracking-wider text-subtle">
            {isDelete ? "Remove" : s.kind === "paragraph" ? "Replacement paragraph" : "Replacement"}
          </div>
          <p className="mt-0.5 text-fg">{isDelete ? "Delete this sentence." : s.rewrite}</p>
        </div>
      ) : null}
      {!isWord ? (
        <div className="mt-2 flex gap-2">
          <Button type="button" size="sm" variant="solid" onClick={() => accept(scanId, s.id)}>
            <Check className="size-4" />
            {isDelete ? "Remove" : isClean ? "Strip" : "Accept"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(scanId, s.id)}>
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="mt-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(scanId, s.id)}>
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      )}
    </article>
  );
}

function EngineStrip({ scan }: { scan: ScanReport }) {
  return (
    <details className="rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
      <summary className="cursor-pointer text-sm font-medium">How it was scored</summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {scan.results.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 truncate text-muted">{r.name.split(" / ")[0]}</span>
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
    <details className="rounded-lg bg-surface px-3 py-2 shadow-[var(--shadow-border)]" open={!!f}>
      <summary className="cursor-pointer text-sm font-medium">Faculty verdict</summary>
      <p className="mt-1 text-xs text-subtle">Optional Grok close-read. Needs an xAI key.</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? <Loader2 className="animate-spin" /> : <ScanSearch className="size-4" />}
        {f ? "Re-run" : "Committee read"}
      </Button>
      {err ? <p className="mt-2 text-sm text-machine">{err}</p> : null}
      {f ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <p className="text-sm leading-relaxed">{f.verdict}</p>
          <Badge tone={LABEL_TONE[f.label]}>{labelCopy(f.label)}</Badge>
        </div>
      ) : null}
    </details>
  );
}
