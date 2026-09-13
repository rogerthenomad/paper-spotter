import { artifactSuggestions, scanArtifacts } from "./artifacts";
import { citationSuggestions } from "./citations";
import { ensembleOf, phdSignals, runLocalEngines, windowScores } from "./engines";
import { assessEvidence } from "./readiness";
import { mixShare } from "./mix";
import { paragraphSuggestions } from "./paragraphs";
import { buildSuggestions, mergeSuggestions, punctuationSuggestions } from "./suggestions";
import type { ArtifactReport, Evidence, ScanReport, Suggestion } from "./types";
import { normalize, sentences, words } from "./text";
import { vocabSuggestions } from "./vocab";

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function keyOf(s: string): string {
  return s.toLowerCase().slice(0, 80);
}

const EMPTY_ARTIFACTS: ArtifactReport = {
  count: 0,
  zeroWidth: 0,
  bidi: 0,
  oddSpace: 0,
  homoglyphs: 0,
  kinds: [],
};

const EMPTY_EVIDENCE: Evidence = {
  level: "uncertain",
  summary: "Re-scan to apply the 2026 detector stack.",
  reasons: [],
  hotWindows: 0,
  windowCount: 0,
  styleShift: 0,
  meanWindow: 0,
};

export function scanText(input: {
  text: string;
  title: string;
  source: string;
  sourceKind: ScanReport["sourceKind"];
  id?: string;
  createdAt?: string;
  keepDismissed?: string[];
  acceptedSkip?: string[];
  docMeta?: ScanReport["docMeta"];
}): ScanReport {
  const text = normalize(input.text);
  const artifacts = scanArtifacts(text);
  const results = runLocalEngines(text);
  const { score, agreement, label } = ensembleOf(results);
  const wc = words(text).length;
  const warnings: string[] = [];
  if (wc < 150) {
    warnings.push(
      "Short passages are unreliable. Independent 2026 tests show human false-positives jump below ~150 words.",
    );
  }
  if (wc > 12000) {
    warnings.push("Scored the pasted excerpt only. Window map covers the first ~12k words.");
  }
  if (artifacts.count > 0) {
    warnings.push(
      `${artifacts.count} hidden or look-alike characters. Strip them before a committee read.`,
    );
  }
  if (input.docMeta?.tell) warnings.push(input.docMeta.tell);
  const clipped = wc > 14000 ? words(text).slice(0, 14000).join(" ") : text;
  const dismissed = new Set((input.keepDismissed ?? []).map(keyOf));
  const skip = new Set((input.acceptedSkip ?? []).map(keyOf));
  const suggestions = mergeSuggestions([
    artifactSuggestions(clipped),
    citationSuggestions(clipped),
    punctuationSuggestions(clipped),
    paragraphSuggestions(clipped),
    buildSuggestions(clipped),
    vocabSuggestions(clipped),
  ])
    .filter((s) => !skip.has(keyOf(s.excerpt)))
    .map((s) => (dismissed.has(keyOf(s.excerpt)) ? { ...s, status: "dismissed" as const } : s));

  const windows = windowScores(clipped);
  const openFlags = suggestions.filter((s) => s.status === "open").length;
  const evidence = assessEvidence({
    wordCount: words(clipped).length,
    ensembleAiScore: score,
    agreement,
    windows,
    artifacts,
    openFlags,
  });

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
    windows,
    phd: phdSignals(clipped),
    ensembleAiScore: score,
    ensembleLabel: evidence.level === "hybrid" ? "mixed" : label,
    agreement,
    warnings,
    forensic: null,
    suggestions,
    acceptedSkip: input.acceptedSkip ?? [],
    evidence,
    artifacts,
    mix: mixShare(clipped, suggestions, windows),
    docMeta: input.docMeta,
  };
}

export function dismissedKeys(suggestions: Suggestion[]): string[] {
  return suggestions.filter((s) => s.status === "dismissed").map((s) => keyOf(s.excerpt));
}

export function withReport(scan: ScanReport): ScanReport {
  if (
    Array.isArray(scan.suggestions) &&
    Array.isArray(scan.acceptedSkip) &&
    scan.evidence &&
    scan.artifacts &&
    Array.isArray(scan.windows) &&
    scan.mix
  ) {
    return scan;
  }
  return {
    ...scan,
    suggestions: Array.isArray(scan.suggestions) ? scan.suggestions : [],
    acceptedSkip: Array.isArray(scan.acceptedSkip) ? scan.acceptedSkip : [],
    artifacts: scan.artifacts ?? EMPTY_ARTIFACTS,
    evidence: scan.evidence ?? EMPTY_EVIDENCE,
    windows: Array.isArray(scan.windows) ? scan.windows : [],
    mix: scan.mix ?? { ai: 0, mixed: 0, human: 100 },
  };
}
