import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FileUp, Loader2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ManuscriptView } from "./manuscript-view";
import { SuggestionPanel } from "./suggestion-panel";
import { fetchArxivPaper } from "@/lib/spotter/arxiv";
import { parseArxivId } from "@/lib/spotter/arxiv-id";
import { extractPaperFile } from "@/lib/spotter/extract";
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
  const [activeSug, setActiveSug] = useState<string | null>(null);

  if (!scan) return <Intake />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Review</p>
          <h1 className="mt-1 truncate font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            {scan.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {scan.sourceKind} · {scan.sentenceCount} sentences · tap an underline for the fix
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setActive(null)}>
          <Plus className="size-4" />
          New paper
        </Button>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-2xl bg-inset p-3 sm:p-5">
          <ManuscriptView
            title={scan.title}
            text={scan.text}
            suggestions={scan.suggestions ?? []}
            activeId={activeSug}
            onSelect={setActiveSug}
          />
        </div>
        <SuggestionPanel scan={scan} activeId={activeSug} onSelect={setActiveSug} />
      </div>
    </div>
  );
}

function Intake() {
  const addScan = useSpotterStore((s) => s.addScan);
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
      }),
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Manuscript review</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.1] tracking-tight text-balance sm:text-5xl">
          Upload a paper. See the AI. Fix the voice.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-muted">
          Drop a PDF or Word file. Flagged sentences get Grammarly-style underlines and a rewrite
          in the margin — stock phrases, stacked transitions, hollow claims.
        </p>
      </header>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
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
          "rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4",
          dragging && "ring-1 ring-accent/50",
        )}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-3 rounded-xl bg-inset px-4 py-10 text-center transition-colors duration-[var(--motion-quick)]",
            dragging ? "bg-raised" : "hover:bg-raised/60",
          )}
        >
          {reading ? (
            <Loader2 className="size-8 animate-spin text-muted" />
          ) : (
            <FileUp className="size-8 text-muted" />
          )}
          <div>
            <div className="font-display text-xl tracking-tight">Drop a paper here</div>
            <p className="mt-1 text-sm text-muted">PDF, Word (.docx), Markdown, LaTeX, or plain text</p>
          </div>
          <span className="inline-flex h-11 items-center rounded-lg bg-fg px-4 text-sm font-medium text-bg">
            Choose file
          </span>
        </button>
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

        <div className="mt-3 grid gap-3 rounded-xl bg-inset p-3 sm:p-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted">
              Title
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter 4 — Methods, or paper title"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted">
              Or paste the manuscript
            </span>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a methods section, related-work chapter, or proof sketch…"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 gap-2">
              <Input
                value={arxiv}
                onChange={(e) => setArxiv(e.target.value)}
                placeholder="arXiv id or URL — 1706.03762"
                onKeyDown={(e) => {
                  if (e.key === "Enter") arxivMut.mutate(arxiv);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={arxivMut.isPending || !parseArxivId(arxiv)}
                onClick={() => arxivMut.mutate(arxiv)}
              >
                {arxivMut.isPending ? <Loader2 className="animate-spin" /> : null}
                Fetch
              </Button>
            </div>
            <Button type="button" variant="solid" onClick={runPaste}>
              Review
              <ArrowRight />
            </Button>
          </div>
          {error ? (
            <p className="flex items-start gap-2 text-sm text-machine">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">Try a sample</p>
        <div className="flex flex-wrap gap-2">
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
              className="rounded-full bg-raised px-3 py-2 text-left text-xs text-muted transition-colors hover:text-fg"
            >
              <Badge
                tone={s.kind === "human" ? "human" : s.kind === "ai" ? "ai" : "mixed"}
                className="mr-2"
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
