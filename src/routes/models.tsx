import { createFileRoute } from "@tanstack/react-router";
import { FRONTIER_MODELS } from "@/lib/spotter/models";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/models")({ component: ModelsPage });

function ModelsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">September 2026</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Frontier generators</h1>
        <p className="mt-3 text-pretty text-muted">
          Attribution targets for the committee read. Dissertations drafted in 2025–26 usually
          carry fingerprints from this list — not GPT-3.5. Scores are stylistic hypotheses, not
          identifications.
        </p>
      </header>
      <div className="flex flex-col gap-2">
        {FRONTIER_MODELS.map((m) => (
          <Card key={m.id} className="grid gap-3 rounded-xl p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-xl tracking-tight">{m.name}</h2>
                <span className="text-sm text-muted">{m.lab}</span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{m.academicTell}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge tone={m.status === "frontier" ? "accent" : "default"}>{m.status}</Badge>
              <Badge>{m.released}</Badge>
              <Badge>{m.context}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
