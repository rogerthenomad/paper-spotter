import { ensembleOf, phdSignals, runLocalEngines, windowScores } from "./engines";
import { buildSuggestions } from "./suggestions";
import type { ScanReport, Suggestion } from "./types";
import { normalize, sentences, words } from "./text";

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function keyOf(s: string): string {
  return s.toLowerCase().slice(0, 80);
}

export function scanText(input: {
  text: string;
  title: string;
  source: string;
  sourceKind: ScanReport["sourceKind"];
  id?: string;
  createdAt?: string;
  keepDismissed?: string[];
  acceptedSkip?: string[];
}): ScanReport {
  const text = normalize(input.text);
  const results = runLocalEngines(text);
  const { score, agreement, label } = ensembleOf(results);
  const wc = words(text).length;
  const warnings: string[] = [];
  if (wc < 120) {
    warnings.push("Short passages are unreliable — detectors need a chapter-sized sample.");
  }
  if (wc > 12000) {
    warnings.push("Scored the pasted excerpt only. Window map covers the first ~12k words.");
  }
  const clipped = wc > 14000 ? words(text).slice(0, 14000).join(" ") : text;
  const dismissed = new Set((input.keepDismissed ?? []).map(keyOf));
  const skip = new Set((input.acceptedSkip ?? []).map(keyOf));
  const suggestions = buildSuggestions(clipped)
    .filter((s) => !skip.has(keyOf(s.excerpt)))
    .map((s) => (dismissed.has(keyOf(s.excerpt)) ? { ...s, status: "dismissed" as const } : s));

  return {
    id: input.id ?? makeId(),
    createdAt: input.createdAt ?? new Date().toISOString(),
    title: input.title || "Untitled manuscript",
    source: input.source,
    sourceKind: input.sourceKind,
    text: clipped,
    wordCount: words(clipped).length,
    sentenceCount: sentences(clipped).length,
    results,
    windows: windowScores(clipped),
    phd: phdSignals(clipped),
    ensembleAiScore: score,
    ensembleLabel: label,
    agreement,
    warnings,
    forensic: null,
    suggestions,
    acceptedSkip: input.acceptedSkip ?? [],
  };
}

export function dismissedKeys(suggestions: Suggestion[]): string[] {
  return suggestions.filter((s) => s.status === "dismissed").map((s) => keyOf(s.excerpt));
}
