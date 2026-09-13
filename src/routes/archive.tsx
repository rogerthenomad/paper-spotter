import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSpotterStore } from "@/lib/spotter/store";
import type { Label } from "@/lib/spotter/types";

export const Route = createFileRoute("/archive")({ component: ArchivePage });

const TONE: Record<Label, "human" | "mixed" | "ai" | "default"> = {
  human: "human",
  mixed: "mixed",
  ai: "ai",
  unavailable: "default",
  error: "ai",
};

function ArchivePage() {
  const scans = useSpotterStore((s) => s.scans);
  const setActive = useSpotterStore((s) => s.setActive);
  const remove = useSpotterStore((s) => s.removeScan);

  return (
    <div className="flex flex-col gap-4">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Local only</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">Archive</h1>
        <p className="mt-2 text-sm text-pretty text-muted">
          Reviews stay in this browser. Nothing is uploaded except optional Grok rewrites, the
          faculty verdict, and arXiv fetch.
        </p>
      </header>
      {scans.length === 0 ? (
        <p className="text-sm text-muted">No papers yet. Upload one from Review.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {scans.map((s) => {
            const open = (s.suggestions ?? []).filter((g) => g.status === "open").length;
            return (
              <li key={s.id}>
                <Card className="flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg tracking-tight">{s.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(s.createdAt).toLocaleString()} · {s.wordCount.toLocaleString()} words
                      · {open} open {open === 1 ? "fix" : "fixes"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[s.ensembleLabel]}>{Math.round(s.ensembleAiScore * 100)}</Badge>
                    <Button variant="secondary" size="sm" asChild>
                      <Link to="/" onClick={() => setActive(s.id)}>
                        Open
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label="Remove scan"
                      onClick={() => remove(s.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
