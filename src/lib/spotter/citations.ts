import { CITATION_RES } from "./lexicon.ts";
import { sentenceSpans } from "./suggestions.ts";
import { words } from "./text.ts";
import type { Suggestion } from "./types.ts";

/** Unsourced authority — a 2025–26 LLM lit-review tell, and a PhD integrity risk. */
const VAGUE_CLAIMS = [
  "studies have shown",
  "research has shown",
  "research has demonstrated",
  "research has found",
  "it has been shown that",
  "it has been demonstrated that",
  "it has been reported that",
  "numerous studies",
  "a number of studies",
  "previous studies have",
  "prior studies have",
  "existing literature",
  "the literature suggests",
  "researchers have found",
  "researchers have shown",
  "it is well known that",
  "it is widely accepted that",
  "there is a growing body",
];

function hasCitation(sentence: string): boolean {
  return CITATION_RES.some((re) => new RegExp(re.source, re.flags).test(sentence));
}

function futureYear(sentence: string): string | null {
  const years = sentence.match(/\b(202[7-9]|20[3-9]\d)\b/g);
  return years?.[0] ?? null;
}

export function citationSuggestions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  for (const span of sentenceSpans(text)) {
    if (words(span.text).length < 8) continue;
    const lower = span.text.toLowerCase();
    const vague = VAGUE_CLAIMS.find((p) => lower.includes(p));
    const year = futureYear(span.text);

    if (vague && !hasCitation(span.text)) {
      out.push({
        id: `cite-${span.start}`,
        kind: "citation",
        severity: "high",
        start: span.start,
        end: span.end,
        excerpt: span.text,
        title: "Unsourced claim",
        issue: `“${vague}” with no named paper, author, or year in the sentence. LLM literature reviews lean on this hollow authority.`,
        recommendation:
          "Name the paper, give a year, or drop the claim. A dissertation cannot rest on ‘studies have shown’.",
        rewrite: span.text,
        status: "open",
      });
      continue;
    }

    if (year) {
      out.push({
        id: `cite-${span.start}`,
        kind: "citation",
        severity: "high",
        start: span.start,
        end: span.end,
        excerpt: span.text,
        title: "Impossible year",
        issue: `Cites ${year}. That date is in the future relative to this review — a common hallucinated-reference tell.`,
        recommendation: "Check the reference list. Invented citations are a fail, not a style issue.",
        rewrite: span.text,
        status: "open",
      });
    }
  }
  return out.slice(0, 8);
}
