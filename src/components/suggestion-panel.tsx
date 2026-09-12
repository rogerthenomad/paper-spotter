import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Eraser, Loader2, PenLine, ScanSearch, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { runForensicPass } from "@/lib/spotter/forensic";
import { reportMarkdown } from "@/lib/spotter/readiness";
import { rewritePassages } from "@/lib/spotter/rewrite";
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
import { ScoreRing } from "./score-ring";
import { cn } from "@/lib/utils";

type Tab = "sentences" | "words" | "paragraphs";

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
  const counts = useMemo(
    () => ({
      sentences: open.filter((s) => SENTENCE_KINDS.has(s.kind)).length,
      words: open.filter((s) => s.kind === "word").length,
      paragraphs: open.filter((s) => s.kind === "paragraph").length,
    }),
    [open],
  );

  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
      <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center gap-4">
          <ScoreRing
            score={1 - scan.ensembleAiScore}
            label={scan.ensembleLabel}
            size={96}
            caption="Voice"
          />
          <div className="min-w-0">
            <Badge tone={EV_TONE[ev?.level ?? "uncertain"]}>
              {evidenceCopy(ev?.level ?? "uncertain")}
            </Badge>
            <p className="mt-2 text-sm leading-relaxed text-fg">{ev?.summary}</p>
            <p className="mt-1 text-xs text-subtle">{scan.wordCount.toLocaleString()} words</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-1">
          <MixPill label="AI" value={mix.ai} tone="ai" />
          <MixPill label="Mixed" value={mix.mixed} tone="mixed" />
          <MixPill label="Human" value={mix.human} tone="human" />
        </div>
        {scan.warnings.slice(0, 1).map((w) => (
          <p key={w} className="mt-3 text-xs text-mixed">
            {w}
          </p>
        ))}
      </div>

      <PassageMap scan={scan} />
      <ActionRow scan={scan} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1 shadow-[var(--shadow-border)]">
        {(
          [
            ["sentences", "Sentences", counts.sentences],
            ["words", "Words", counts.words],
            ["paragraphs", "Paragraphs", counts.paragraphs],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-2 py-2 text-center text-xs transition-colors duration-[var(--motion-quick)]",
              tab === id ? "bg-raised text-fg" : "text-muted hover:text-fg",
            )}
          >
            <div className="font-medium">{label}</div>
            <div className="mt-0.5 tabular-nums text-subtle">{n}</div>
          </button>
        ))}
      </div>

      <RewriteBar scan={scan} open={shown} tab={tab} />

      {shown.length === 0 ? (
        <div className="rounded-xl bg-surface px-4 py-6 text-sm text-muted shadow-[var(--shadow-border)]">
          {tab === "words"
            ? "No generator vocab left to swap."
            : tab === "paragraphs"
              ? "No paragraph-sized machine patches. Sentence fixes may still apply."
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

      <EngineStrip scan={scan} />
      <ForensicBlock scan={scan} />
    </aside>
  );
}

function MixPill({
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
        "rounded-lg px-2 py-2 text-center",
        tone === "ai" && "bg-machine/15 text-machine",
        tone === "mixed" && "bg-mixed/15 text-mixed",
        tone === "human" && "bg-human/15 text-human",
      )}
    >
      <div className="font-display text-xl tabular-nums leading-none">{value}%</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

function PassageMap({ scan }: { scan: ScanReport }) {
  const windows = scan.windows ?? [];
  if (windows.length < 2) return null;
  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="text-sm font-medium">Passage map</div>
      <div className="mt-3 flex gap-1">
        {windows.map((w) => (
          <div
            key={w.index}
            title={`${Math.round(w.aiScore * 100)}% machine-like — ${w.preview}`}
            className={cn(
              "h-8 flex-1 rounded-sm",
              w.label === "ai" && "bg-machine",
              w.label === "mixed" && "bg-mixed",
              w.label === "human" && "bg-human",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-subtle">
        {scan.evidence?.hotWindows ?? 0} of {windows.length} windows hot
      </p>
    </div>
  );
}

function ActionRow({ scan }: { scan: ScanReport }) {
  const stripHidden = useSpotterStore((s) => s.stripHidden);
  const [copied, setCopied] = useState(false);
  const hasArtifacts = (scan.artifacts?.count ?? 0) > 0;

  async function copyReport() {
    const md = reportMarkdown(scan);
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" className="w-full" onClick={() => void copyReport()}>
        <Copy className="size-4" />
        {copied ? "Copied" : "Copy committee report"}
      </Button>
      {hasArtifacts ? (
        <Button type="button" variant="secondary" className="w-full" onClick={() => stripHidden(scan.id)}>
          <Eraser className="size-4" />
          Strip {scan.artifacts.count} hidden characters
        </Button>
      ) : null}
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

  if (tab === "words" || open.length === 0) return null;

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
        {tab === "paragraphs" ? "Rewrite paragraphs with Grok" : "Rewrite sentences with Grok"}
      </Button>
      <p className="text-xs text-subtle">
        Local replacements are already in each card. Grok is optional and spends xAI quota.
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
  const isClean = s.kind === "artifact";
  const isWord = s.kind === "word";
  const alts = s.alternatives ?? [];
  const showTry = !isClean && !isWord && s.rewrite !== s.excerpt;

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
      {s.kind !== "artifact" ? (
        <blockquote className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-inset px-3 py-2 text-sm leading-relaxed text-muted">
          {s.excerpt}
        </blockquote>
      ) : null}
      {isWord ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-wider text-subtle">Replace with</div>
          <div className="flex flex-wrap gap-2">
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
          {s.replaceAll ? (
            <p className="text-xs text-subtle">Accept swaps every occurrence in the chapter.</p>
          ) : null}
        </div>
      ) : null}
      {showTry || isDelete ? (
        <div className="mt-2 rounded-lg bg-inset px-3 py-2 text-sm leading-relaxed">
          <div className="text-[11px] uppercase tracking-wider text-subtle">
            {isDelete ? "Remove" : s.kind === "paragraph" ? "Replacement paragraph" : "Replacement sentence"}
          </div>
          <p className="mt-1 text-fg">{isDelete ? "Delete this sentence — it carries no claim." : s.rewrite}</p>
        </div>
      ) : null}
      {!isWord ? (
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" variant="solid" onClick={() => accept(scanId, s.id)}>
            <Check className="size-4" />
            {isDelete ? "Remove" : isClean ? "Strip" : s.kind === "paragraph" ? "Replace paragraph" : "Accept"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => dismiss(scanId, s.id)}>
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      ) : (
        <div className="mt-3">
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
