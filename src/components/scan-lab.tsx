import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Copy, Eraser, FileUp, Loader2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ManuscriptView } from "./manuscript-view";
import { SuggestionPanel } from "./suggestion-panel";
import { fetchArxivPaper } from "@/lib/spotter/arxiv";
import { parseArxivId } from "@/lib/spotter/arxiv-id";
import { extractPaperFile } from "@/lib/spotter/extract";
import { reportMarkdown } from "@/lib/spotter/readiness";
import { SAMPLE_PAPERS } from "@/lib/spotter/samples";
import { scanText } from "@/lib/spotter/scan";
import { useActiveScan, useSpotterStore } from "@/lib/spotter/store";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";
import { cn } from "@/lib/utils";

export function ScanLab() {
  const scan = useActiveScan();
  const setActive = useSpotterStore((s) => s.setActive);
  const stripHidden = useSpotterStore((s) => s.stripHidden);
  const [activeSug, setActiveSug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!scan) return <Intake />;
  const report = scan;

  const mix = report.mix ?? { ai: 0, mixed: 0, human: 100 };
  const hasArtifacts = (report.artifacts?.count ?? 0) > 0;

  async function copyReport() {
    const md = reportMarkdown(report);
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
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg leading-tight tracking-tight sm:text-xl">
            {report.title}
          </h1>
          <p className="truncate text-[11px] text-muted">
            {report.sourceKind} · {report.wordCount.toLocaleString()} words · tap an underline
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <MixChip label="AI" value={mix.ai} tone="ai" />
          <MixChip label="Mix" value={mix.mixed} tone="mixed" />
          <MixChip label="Human" value={mix.human} tone="human" />
        </div>
        {report.windows && report.windows.length >= 2 ? (
          <div className="hidden h-6 w-28 overflow-hidden rounded-sm sm:flex" title="Passage map">
            {report.windows.map((w) => (
              <div
                key={w.index}
                className={cn(
                  "h-full flex-1",
                  w.label === "ai" && "bg-machine",
                  w.label === "mixed" && "bg-mixed",
                  w.label === "human" && "bg-human",
                )}
              />
            ))}
          </div>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="hidden sm:inline-flex"
          onClick={() => void copyReport()}
        >
          <Copy className="size-4" />
          {copied ? "Copied" : "Report"}
        </Button>
        {hasArtifacts ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => stripHidden(report.id)}>
            <Eraser className="size-4" />
            Strip
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="secondary" onClick={() => setActive(null)}>
          <Plus className="size-4" />
          New
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-2 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-h-0 overflow-y-auto bg-inset p-3 sm:p-4">
          <ManuscriptView
            title={report.title}
            text={report.text}
            suggestions={report.suggestions ?? []}
            activeId={activeSug}
            onSelect={setActiveSug}
          />
        </div>
        <div className="min-h-0 overflow-hidden border-t border-border lg:border-l lg:border-t-0">
          <SuggestionPanel scan={report} activeId={activeSug} onSelect={setActiveSug} />
        </div>
      </div>
    </div>
  );
}

function MixChip({
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
        "rounded-md px-2 py-1 text-center",
        tone === "ai" && "bg-machine/15 text-machine",
        tone === "mixed" && "bg-mixed/15 text-mixed",
        tone === "human" && "bg-human/15 text-human",
      )}
    >
      <div className="font-display text-sm tabular-nums leading-none">{value}%</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider">{label}</div>
    </div>
  );
}

type IntakeMode = "file" | "paste" | "arxiv";

function Intake() {
  const addScan = useSpotterStore((s) => s.addScan);
  const [mode, setMode] = useState<IntakeMode>("file");
  const [text, setText] = useState("");
  const [arxiv, setArxiv] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const arxivMut = useMutation({
    mutationFn: async (id: string) => fetchArxivPaper({ data: { id } }),
    onSuccess: (res) => {
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const body = res.paper.fullText?.trim() || res.paper.summary;
      addScan(
        scanText({
          text: body,
          title: res.paper.title,
          source: res.paper.absUrl,
          sourceKind: "arxiv",
        }),
      );
      setError(null);
    },
    onError: () => setError("arXiv fetch failed."),
  });

  function runPaste() {
    if (text.trim().split(/\s+/).length < 40) {
      setError("Need at least ~40 words — a paragraph of the paper, not a title.");
      return;
    }
    addScan(
      scanText({
        text,
        title: title || "Pasted manuscript",
        source: "clipboard",
        sourceKind: "paste",
      }),
    );
    setError(null);
  }

  async function onFile(file: File) {
    setReading(true);
    setError(null);
    const res = await extractPaperFile(file);
    setReading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle(res.title);
    setText(res.text);
    addScan(
      scanText({
        text: res.text,
        title: res.title,
        source: file.name,
        sourceKind: "file",
        docMeta: res.meta,
      }),
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col overflow-y-auto px-4 py-5 sm:px-6">
      <header className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">PhD manuscript desk</p>
        <h1 className="mt-1 font-display text-2xl leading-tight tracking-tight sm:text-3xl">
          Upload a chapter. Fix the AI voice.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Underlines, word swaps, and a source desk that checks whether the cites actually exist.
        </p>
      </header>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
          setMode("file");
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void onFile(f);
        }}
        className={cn(
          "rounded-xl bg-surface p-2 shadow-[var(--shadow-border)] sm:p-3",
          dragging && "ring-1 ring-accent/50",
        )}
      >
        <div className="mb-2 grid grid-cols-3 gap-1 rounded-lg bg-inset p-1">
          {(["file", "paste", "arxiv"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "h-9 rounded-md text-sm capitalize",
                mode === id ? "bg-raised text-fg" : "text-muted hover:text-fg",
              )}
            >
              {id === "arxiv" ? "arXiv" : id}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-lg bg-inset px-4 py-8 text-center",
              dragging ? "bg-raised" : "hover:bg-raised/60",
            )}
          >
            {reading ? (
              <Loader2 className="size-6 animate-spin text-muted" />
            ) : (
              <FileUp className="size-6 text-muted" />
            )}
            <div className="font-display text-lg tracking-tight">Drop a PDF or Word file</div>
            <p className="text-xs text-muted">.pdf · .docx · .txt · .md · .tex</p>
          </button>
        ) : null}

        {mode === "paste" ? (
          <div className="flex flex-col gap-2 p-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter title"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a methods section, related-work chapter, or bibliography…"
              className="min-h-28 max-h-40"
            />
            <Button type="button" variant="solid" onClick={runPaste}>
              Review
              <ArrowRight />
            </Button>
          </div>
        ) : null}

        {mode === "arxiv" ? (
          <div className="flex gap-2 p-1">
            <Input
              value={arxiv}
              onChange={(e) => setArxiv(e.target.value)}
              placeholder="1706.03762 or an abs URL"
              onKeyDown={(e) => {
                if (e.key === "Enter") arxivMut.mutate(arxiv);
              }}
            />
            <Button
              type="button"
              variant="solid"
              disabled={arxivMut.isPending || !parseArxivId(arxiv)}
              onClick={() => arxivMut.mutate(arxiv)}
            >
              {arxivMut.isPending ? <Loader2 className="animate-spin" /> : null}
              Fetch
            </Button>
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.tex,.rst,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />

        {error ? (
          <p className="mt-2 flex items-start gap-2 px-1 text-sm text-machine">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">Try a sample</p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PAPERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                addScan(
                  scanText({
                    text: s.text,
                    title: s.title,
                    source: s.id,
                    sourceKind: "sample",
                  }),
                );
                setError(null);
              }}
              className="rounded-full bg-raised px-2.5 py-1.5 text-left text-xs text-muted hover:text-fg"
            >
              <Badge
                tone={s.kind === "human" ? "human" : s.kind === "ai" ? "ai" : "mixed"}
                className="mr-1.5"
              >
                {s.kind}
              </Badge>
              {s.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
