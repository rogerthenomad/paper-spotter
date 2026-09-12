import { applyFixes, sentenceSpans } from "./suggestions.ts";
import { vocabDensity } from "./vocab.ts";
import { sentences, words } from "./text.ts";
import type { Suggestion } from "./types.ts";

export function paragraphSpans(text: string): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  const re = /\n{2,}/g;
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const chunk = text.slice(from, m.index).trim();
    if (chunk) {
      const start = text.indexOf(chunk, from);
      out.push({ start, end: start + chunk.length, text: chunk });
    }
    from = m.index + m[0].length;
  }
  const tail = text.slice(from).trim();
  if (tail) {
    const start = text.indexOf(tail, from);
    out.push({ start, end: start + tail.length, text: tail });
  }
  return out;
}

function rewriteParagraph(source: string): string {
  return sentences(source)
    .map((s) => applyFixes(s).next)
    .filter(Boolean)
    .join(" ");
}

function isHot(para: string): boolean {
  const sents = sentences(para);
  if (sents.length < 2 || words(para).length < 40) return false;
  const density = vocabDensity(para);
  let stripped = 0;
  for (const s of sents) {
    if (applyFixes(s).strippedTransition || applyFixes(s).hits.length >= 1) stripped += 1;
  }
  return density >= 0.012 || stripped / sents.length >= 0.4;
}

export function paragraphSuggestions(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  for (const span of paragraphSpans(text)) {
    if (!isHot(span.text)) continue;
    const next = rewriteParagraph(span.text);
    if (!next || next === span.text) continue;
    const nSents = sentences(span.text).length;
    out.push({
      id: `para-${span.start}`,
      kind: "paragraph",
      severity: vocabDensity(span.text) >= 0.02 ? "high" : "med",
      start: span.start,
      end: span.end,
      excerpt: span.text,
      title: "Paragraph rewrite",
      issue: `This ${nSents}-sentence paragraph is in the academic-LLM register (stock verbs, stacked connectives, even cadence).`,
      recommendation:
        "Accept the local rewrite, pick an alternate word set first, or send the paragraph to Grok. Do not invent citations.",
      rewrite: next,
      status: "open",
      highlight: false,
    });
  }
  return out.slice(0, 4);
}

export function sentenceReplacementSuggestions(text: string): Suggestion[] {
  /** Extra sentence rewrites for flagged cadence even when phrase map already fired — used as fallback. */
  const out: Suggestion[] = [];
  for (const span of sentenceSpans(text)) {
    if (words(span.text).length < 12) continue;
    const { next, hits, strippedTransition } = applyFixes(span.text);
    if (hits.length === 0 && !strippedTransition) continue;
    if (!next || next === span.text) continue;
    out.push({
      id: `sent-${span.start}`,
      kind: "cliche",
      severity: hits.length >= 2 ? "high" : "med",
      start: span.start,
      end: span.end,
      excerpt: span.text,
      title: "Sentence rewrite",
      issue: hits.length
        ? `Swap ${hits.slice(0, 2).map((h) => `\u201c${h.phrase}\u201d`).join(", ")}.`
        : "Stacked connective. Lead with the fact.",
      recommendation: "Accept this sentence, or try an alternative below.",
      rewrite: next,
      status: "open",
      alternatives: [],
    });
  }
  return out;
}
