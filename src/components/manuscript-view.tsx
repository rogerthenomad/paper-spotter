import { useEffect } from "react";
import type { Suggestion } from "@/lib/spotter/types";
import { cn } from "@/lib/utils";

export function ManuscriptView({
  title,
  text,
  suggestions,
  activeId,
  onSelect,
}: {
  title: string;
  text: string;
  suggestions: Suggestion[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const marks = suggestions
    .filter((s) => {
      if (s.status !== "open" || s.end <= s.start) return false;
      if (s.id === activeId) return true;
      if (s.highlight === false) return false;
      return true;
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  useEffect(() => {
    if (!activeId) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(`mark-${activeId}`)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }, [activeId]);

  const parts: Array<string | Suggestion> = [];
  let cursor = 0;
  for (const s of marks) {
    if (s.start < cursor) continue;
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    parts.push(s);
    cursor = s.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return (
    <article className="paper-page mx-auto w-full max-w-3xl rounded-lg px-5 py-6 text-paper-fg shadow-[var(--shadow-paper)] sm:px-8 sm:py-8">
      <h2 className="font-display text-xl leading-snug tracking-tight text-balance sm:text-2xl">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap font-display text-[15px] leading-[1.65] sm:text-base">
        {parts.map((p, i) =>
          typeof p === "string" ? (
            <span key={`t-${i}`}>{p}</span>
          ) : (
            <mark
              key={p.id}
              id={`mark-${p.id}`}
              tabIndex={0}
              role="button"
              data-active={activeId === p.id}
              data-sev={p.severity}
              data-kind={p.kind}
              className={cn(
                "paper-mark cursor-pointer rounded-sm",
                p.severity === "high" && "paper-mark-high",
                p.severity === "med" && "paper-mark-med",
                p.severity === "low" && "paper-mark-low",
                p.kind === "citation" && "paper-mark-cite",
                p.kind === "word" && "paper-mark-word",
                p.kind === "paragraph" && "paper-mark-para",
              )}
              onClick={() => onSelect(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(p.id);
                }
              }}
            >
              {text.slice(p.start, p.end)}
            </mark>
          ),
        )}
      </p>
    </article>
  );
}
