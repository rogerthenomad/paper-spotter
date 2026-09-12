import { words } from "./text.ts";
import type { Suggestion } from "./types.ts";

export interface VocabSwap {
  word: string;
  replace: string;
  alternatives: string[];
  note: string;
}

/** GPTZero-style AI vocab — high-frequency 2024–26 generator words with conservative swaps. */
export const VOCAB_SWAPS: VocabSwap[] = [
  { word: "leverage", replace: "use", alternatives: ["draw on", "apply"], note: "Blank corporate verb." },
  { word: "leveraging", replace: "using", alternatives: ["drawing on", "applying"], note: "Blank corporate verb." },
  { word: "leveraged", replace: "used", alternatives: ["drew on", "applied"], note: "Blank corporate verb." },
  { word: "utilize", replace: "use", alternatives: ["apply"], note: "Longer synonym of use." },
  { word: "utilizing", replace: "using", alternatives: ["applying"], note: "Longer synonym of use." },
  { word: "utilized", replace: "used", alternatives: ["applied"], note: "Longer synonym of use." },
  { word: "facilitate", replace: "help", alternatives: ["allow", "make possible"], note: "Inflated help." },
  { word: "facilitates", replace: "helps", alternatives: ["allows"], note: "Inflated help." },
  { word: "facilitating", replace: "helping", alternatives: ["allowing"], note: "Inflated help." },
  { word: "delve", replace: "examine", alternatives: ["look at", "study"], note: "Stock LLM verb." },
  { word: "delves", replace: "examines", alternatives: ["looks at"], note: "Stock LLM verb." },
  { word: "delving", replace: "examining", alternatives: ["looking at"], note: "Stock LLM verb." },
  { word: "tapestry", replace: "mix", alternatives: ["set", "range"], note: "Decorative metaphor." },
  { word: "multifaceted", replace: "many-sided", alternatives: ["several", "varied"], note: "Empty intensifier." },
  { word: "holistic", replace: "overall", alternatives: ["full", "joint"], note: "Empty intensifier." },
  { word: "groundbreaking", replace: "new", alternatives: ["first", "original"], note: "Hype adjective." },
  { word: "cutting-edge", replace: "recent", alternatives: ["current"], note: "Hype adjective." },
  { word: "pivotal", replace: "central", alternatives: ["main", "key"], note: "Hype adjective." },
  { word: "aforementioned", replace: "these", alternatives: ["the", "those"], note: "Legalistic filler." },
  { word: "showcasing", replace: "showing", alternatives: ["presenting"], note: "Marketing verb." },
  { word: "showcase", replace: "show", alternatives: ["present"], note: "Marketing verb." },
  { word: "underscores", replace: "shows", alternatives: ["marks", "supports"], note: "LLM favourite." },
  { word: "underscore", replace: "show", alternatives: ["mark"], note: "LLM favourite." },
  { word: "underscored", replace: "showed", alternatives: ["marked"], note: "LLM favourite." },
  { word: "plethora", replace: "many", alternatives: ["a lot of"], note: "Ornate quantifier." },
  { word: "realm", replace: "field", alternatives: ["area"], note: "In the realm of…" },
  { word: "interplay", replace: "link", alternatives: ["relation"], note: "Vague relation noun." },
  { word: "testament", replace: "evidence", alternatives: ["sign"], note: "A testament to…" },
  { word: "garnered", replace: "drawn", alternatives: ["attracted", "won"], note: "Attention-cliché verb." },
  { word: "commence", replace: "start", alternatives: ["begin"], note: "Stiff synonym." },
  { word: "endeavor", replace: "attempt", alternatives: ["effort"], note: "Stiff synonym." },
  { word: "adept", replace: "skilled", alternatives: ["good at"], note: "Flattery adjective." },
  { word: "intricate", replace: "detailed", alternatives: ["complex"], note: "Decorative adjective." },
  { word: "noteworthy", replace: "worth noting", alternatives: ["striking"], note: "Empty emphasis." },
  { word: "invaluable", replace: "useful", alternatives: ["important"], note: "Empty emphasis." },
  { word: "subsequently", replace: "then", alternatives: ["later", "next"], note: "Padded transition." },
  { word: "thereby", replace: "and so", alternatives: ["thus"], note: "Padded transition." },
  { word: "furthermore", replace: "also", alternatives: ["and"], note: "Stacked connective." },
  { word: "moreover", replace: "also", alternatives: ["and"], note: "Stacked connective." },
  { word: "additionally", replace: "also", alternatives: ["and"], note: "Stacked connective." },
  { word: "comprehensive", replace: "full", alternatives: ["broad", "complete"], note: "Overclaim adjective." },
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchCase(source: string, replacement: string): string {
  if (!source || !replacement) return replacement;
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function replaceAllWord(text: string, word: string, replacement: string): string {
  const re = new RegExp(`\\b${escapeRe(word)}\\b`, "gi");
  return text.replace(re, (hit) => matchCase(hit, replacement));
}

export function vocabSuggestions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const v of VOCAB_SWAPS) {
    const re = new RegExp(`\\b${escapeRe(v.word)}\\b`, "gi");
    const hits = text.match(re) ?? [];
    if (hits.length === 0) continue;
    const key = v.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    re.lastIndex = 0;
    const m = re.exec(text);
    if (!m) continue;
    out.push({
      id: `word-${m.index}`,
      kind: "word",
      severity: hits.length >= 3 ? "high" : hits.length >= 2 ? "med" : "low",
      start: m.index,
      end: m.index + m[0].length,
      excerpt: m[0],
      title: "AI vocab",
      issue:
        hits.length > 1
          ? `\u201c${v.word}\u201d appears ${hits.length} times. ${v.note}`
          : `\u201c${v.word}\u201d is a 2025\u201326 generator word. ${v.note}`,
      recommendation: `Replace with \u201c${v.replace}\u201d${v.alternatives.length ? ` (or ${v.alternatives.map((a) => `\u201c${a}\u201d`).join(", ")})` : ""}.`,
      rewrite: v.replace,
      status: "open",
      alternatives: v.alternatives,
      replaceAll: true,
      match: v.word,
    });
  }
  const rank: Record<string, number> = { high: 0, med: 1, low: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.start - b.start);
  return out.slice(0, 14);
}

export function vocabDensity(text: string): number {
  const n = Math.max(words(text).length, 1);
  let hits = 0;
  const lower = text.toLowerCase();
  for (const v of VOCAB_SWAPS) {
    const re = new RegExp(`\\b${escapeRe(v.word)}\\b`, "g");
    hits += (lower.match(re) ?? []).length;
  }
  return hits / n;
}
