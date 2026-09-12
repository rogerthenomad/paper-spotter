import { createFileRoute } from "@tanstack/react-router";
import { DETECTOR_PAPERS } from "@/lib/spotter/models";
import { Card, CardMeta, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/engines")({ component: EnginesPage });

function EnginesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Detector stack</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Engines</h1>
        <p className="mt-3 text-pretty text-muted">
          The original Paper Spotter toolkit promised adapters for the open detector literature.
          This lab runs faithful statistical proxies in the browser, then an optional live Grok 4.5
          pass. GPU originals (Falcon, GPT-J, T5-3B) are cited, not silently faked.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {DETECTOR_PAPERS.map((d) => (
          <Card key={d.id} className="flex flex-col gap-3 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3">
              <CardTitle className="text-xl">{d.name}</CardTitle>
              <Badge>{d.year}</Badge>
            </div>
            <CardMeta>{d.venue}</CardMeta>
            <p className="text-sm leading-relaxed text-muted">{d.blurb}</p>
            <p className="text-xs text-subtle">{d.citation}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
