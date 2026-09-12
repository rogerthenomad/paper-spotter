import { AI_CLICHES, TRANSITION_STACK } from "./lexicon.ts";
import { normalize, sentences, words } from "./text.ts";
import type { Suggestion, SuggestionKind, SuggestionSeverity } from "./types.ts";
import { replaceAllWord } from "./vocab.ts";

/** Conservative phrase swaps — never invent facts, numbers, or citations. */
export const PHRASE_FIXES: { phrase: string; rewrite: string }[] = [
  { phrase: "have garnered significant attention", rewrite: "are now widely studied" },
  { phrase: "has garnered significant attention", rewrite: "is now widely studied" },
  { phrase: "has attracted considerable attention", rewrite: "is widely studied" },
  { phrase: "garnered significant attention", rewrite: "drawn wide attention" },
  { phrase: "to the best of our knowledge", rewrite: "as far as we know" },
  { phrase: "the remainder of this paper is organized as follows", rewrite: "" },
  { phrase: "the remainder of this paper", rewrite: "what follows" },
  { phrase: "it is important to note that", rewrite: "" },
  { phrase: "it's important to note that", rewrite: "" },
  { phrase: "it is important to note", rewrite: "" },
  { phrase: "it's important to note", rewrite: "" },
  { phrase: "it should be noted that", rewrite: "" },
  { phrase: "it should be noted", rewrite: "" },
  { phrase: "it is worth noting that", rewrite: "" },
  { phrase: "it is worth noting", rewrite: "" },
  { phrase: "it is well known that", rewrite: "" },
  { phrase: "it is widely accepted that", rewrite: "" },
  { phrase: "it is evident that", rewrite: "" },
  { phrase: "as an illustrative example", rewrite: "for example" },
  { phrase: "in today's rapidly", rewrite: "in this" },
  { phrase: "in the context of", rewrite: "in" },
  { phrase: "a comprehensive overview", rewrite: "a survey" },
  { phrase: "a comprehensive tapestry", rewrite: "a survey" },
  { phrase: "a comprehensive framework", rewrite: "a method" },
  { phrase: "rich tapestry", rewrite: "mix" },
  { phrase: "intricate interplay", rewrite: "link" },
  { phrase: "in the realm of", rewrite: "in" },
  { phrase: "have played a pivotal role", rewrite: "were central" },
  { phrase: "played a pivotal role", rewrite: "was central" },
  { phrase: "plays a pivotal role", rewrite: "is central" },
  { phrase: "plays an important role", rewrite: "matters" },
  { phrase: "play a crucial role", rewrite: "matter" },
  { phrase: "plays a crucial role", rewrite: "matters" },
  { phrase: "we propose a novel", rewrite: "we propose" },
  { phrase: "addresses this gap", rewrite: "targets this problem" },
  { phrase: "address this gap", rewrite: "treat this problem" },
  { phrase: "fill this gap", rewrite: "treat this problem" },
  { phrase: "remains an open challenge", rewrite: "is still unsolved" },
  { phrase: "significantly enhances", rewrite: "improves" },
  { phrase: "significantly enhance", rewrite: "improve" },
  { phrase: "has garnered significant", rewrite: "has drawn" },
  { phrase: "garnered considerable", rewrite: "drawn" },
  { phrase: "a growing body of", rewrite: "more" },
  { phrase: "paves the way", rewrite: "allows" },
  { phrase: "rapidly evolving", rewrite: "fast-changing" },
  { phrase: "ever-evolving", rewrite: "changing" },
  { phrase: "cutting-edge", rewrite: "recent" },
  { phrase: "groundbreaking", rewrite: "new" },
  { phrase: "paradigm shift", rewrite: "change" },
  { phrase: "robust frameworks", rewrite: "methods" },
  { phrase: "robust framework", rewrite: "method" },
  { phrase: "this paper aims to", rewrite: "we" },
  { phrase: "in this paper we", rewrite: "we" },
  { phrase: "the aforementioned", rewrite: "these" },
  { phrase: "a testament to", rewrite: "evidence of" },
  { phrase: "shedding light on", rewrite: "showing" },
  { phrase: "shedding light", rewrite: "showing" },
  { phrase: "sheds light on", rewrite: "shows" },
  { phrase: "sheds light", rewrite: "shows" },
  { phrase: "underscored the", rewrite: "shown the" },
  { phrase: "underscores the", rewrite: "shows the" },
  { phrase: "underscore the", rewrite: "show the" },
  { phrase: "landscape of", rewrite: "field of" },
  { phrase: "in recent years", rewrite: "recently" },
  { phrase: "a wide range of", rewrite: "many" },
  { phrase: "pivotal role", rewrite: "central part" },
  { phrase: "in conclusion", rewrite: "" },
  { phrase: "multifaceted", rewrite: "many-sided" },
  { phrase: "holistic", rewrite: "overall" },
  { phrase: "leveraging", rewrite: "using" },
  { phrase: "leveraged", rewrite: "used" },
  { phrase: "leverage", rewrite: "use" },
  { phrase: "utilizing", rewrite: "using" },
  { phrase: "utilize", rewrite: "use" },
  { phrase: "facilitates", rewrite: "helps" },
  { phrase: "showcasing", rewrite: "showing" },
  { phrase: "delving", rewrite: "examining" },
  { phrase: "delves", rewrite: "examines" },
  { phrase: "delve into", rewrite: "examine" },
  { phrase: "delve", rewrite: "examine" },
  { phrase: "tapestry", rewrite: "set" },
  { phrase: "remarkable capabilities", rewrite: "results" },
  { phrase: "exciting area", rewrite: "field" },
  { phrase: "state-of-the-art", rewrite: "current" },
  { phrase: "firstly", rewrite: "first" },
  { phrase: "secondly", rewrite: "second" },
  { phrase: "lastly", rewrite: "last" },
];

const KIND_COPY: Record<
  SuggestionKind,
  { title: string; recommendation: string }
> = {
  cliche: {
    title: "AI stock phrase",
    recommendation:
      "Swap the template language for a concrete noun, number, named paper, or limitation.",
  },
  cadence: {
    title: "Machine cadence",
    recommendation: "Drop the stacked transition and lead with the fact.",
  },
  hollow: {
    title: "Empty claim",
    recommendation: "Cut the sentence, or attach a result, limitation, or citation.",
  },
  citation: {
    title: "Unsourced claim",
    recommendation: "Name the paper, give a year, or drop the sentence.",
  },
  artifact: {
    title: "Hidden characters",
    recommendation: "Strip invisible Unicode, then re-score.",
  },
  punctuation: {
    title: "Em-dash stack",
    recommendation: "ChatGPT-family prose over-uses em dashes. Break into two sentences or use a comma.",
  },
  word: {
    title: "AI vocab",
    recommendation: "Swap the generator word for a plain verb or noun. Accept replaces every occurrence.",
  },
  paragraph: {
    title: "Paragraph rewrite",
    recommendation: "Replace the whole paragraph with a tighter scholarly version. Check that no claim was invented.",
  },
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replacePhrase(hay: string, phrase: string, rewrite: string): string {
  const escaped = escapeRe(phrase);
  const re = phrase.includes(" ")
    ? new RegExp(escaped, "ig")
    : new RegExp(`\\b${escaped}\\b`, "ig");
  return hay.replace(re, rewrite);
}

function tidy(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/^[,;:\s]+/, "")
    .replace(/\s+\./g, ".")
    .trim();
}

function capitalize(s: string): string {
  if (!s) return s;
  const i = s.search(/[A-Za-z]/);
  if (i < 0) return s;
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
}

function stripTransition(sentence: string): { next: string; stripped: boolean } {
  const re = new RegExp(
    `^(${TRANSITION_STACK.map(escapeRe).join("|")}),?\\s+`,
    "i",
  );
  const next = sentence.replace(re, "");
  return { next, stripped: next !== sentence };
}

export function applyFixes(sentence: string): {
  next: string;
  hits: { phrase: string; rewrite: string }[];
  strippedTransition: boolean;
} {
  const trans = stripTransition(sentence);
  let next = trans.next;
  const hits: { phrase: string; rewrite: string }[] = [];
  const sorted = [...PHRASE_FIXES].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const f of sorted) {
    const probe = next.toLowerCase();
    const re = f.phrase.includes(" ")
      ? new RegExp(escapeRe(f.phrase), "i")
      : new RegExp(`\\b${escapeRe(f.phrase)}\\b`, "i");
    if (!re.test(probe)) continue;
    hits.push(f);
    next = replacePhrase(next, f.phrase, f.rewrite);
  }
  next = capitalize(tidy(next));
  if (next && !/[.!?]"?$/.test(next) && sentence.trim().endsWith(".")) {
    next += ".";
  }
  return { next, hits, strippedTransition: trans.stripped };
}

export function sentenceSpans(text: string): { start: number; end: number; text: string }[] {
  const source = normalize(text);
  const parts = sentences(source);
  const spans: { start: number; end: number; text: string }[] = [];
  let from = 0;
  for (const p of parts) {
    const idx = source.indexOf(p, from);
    if (idx < 0) continue;
    spans.push({ start: idx, end: idx + p.length, text: p });
    from = idx + p.length;
  }
  return spans;
}

function describe(
  hits: { phrase: string }[],
  strippedTransition: boolean,
  kind: SuggestionKind,
): string {
  const quoted = hits.slice(0, 3).map((h) => `\u201c${h.phrase}\u201d`);
  if (kind === "hollow") {
    return quoted.length
      ? `After stripping ${quoted.join(", ")}, nothing specific remains.`
      : "This sentence performs structure without making a claim.";
  }
  if (kind === "cadence") {
    return strippedTransition
      ? `Stacked academic connective${quoted.length ? ` plus ${quoted.join(", ")}` : ""} \u2014 typical model related-work cadence.`
      : `Uniform model rhythm${quoted.length ? `: ${quoted.join(", ")}` : ""}.`;
  }
  if (quoted.length === 1) {
    return `${quoted[0]} is a 2025\u201326 generator tell. Prefer a specific method, number, or named prior.`;
  }
  return `Stacks ${quoted.join(", ")} \u2014 the academic-LLM register.`;
}

function severityOf(
  hits: number,
  stripped: boolean,
  kind: SuggestionKind,
): SuggestionSeverity {
  if (kind === "hollow") return "high";
  if (hits >= 2 || (stripped && hits >= 1)) return "high";
  if (hits >= 1 || stripped) return "med";
  return "low";
}

export function punctuationSuggestions(text: string): Suggestion[] {
  const source = normalize(text);
  const out: Suggestion[] = [];
  for (const span of sentenceSpans(source)) {
    const n = (span.text.match(/[\u2014\u2013]/g) ?? []).length;
    if (n < 3) continue;
    const next = capitalize(
      tidy(span.text.replace(/\s*[\u2014\u2013]\s*/g, ", ")).replace(/,\s*,/g, ","),
    );
    out.push({
      id: `punct-${span.start}`,
      kind: "punctuation",
      severity: n >= 3 ? "high" : "med",
      start: span.start,
      end: span.end,
      excerpt: span.text,
      title: KIND_COPY.punctuation.title,
      issue: `This sentence uses ${n} em/en dashes. Dense em-dash stacking is a ChatGPT-family tell (not an invisible watermark).`,
      recommendation: KIND_COPY.punctuation.recommendation,
      rewrite: next === span.text ? span.text : next,
      status: "open",
    });
  }
  return out;
}

export function buildSuggestions(text: string): Suggestion[] {
  const source = normalize(text);
  const spans = sentenceSpans(source);
  const out: Suggestion[] = [];

  for (const span of spans) {
    if (words(span.text).length < 8) continue;
    const lower = span.text.toLowerCase();
    const { next, hits, strippedTransition } = applyFixes(span.text);
    const lexiconHits = AI_CLICHES.filter((c) => lower.includes(c.phrase));
    if (hits.length === 0 && !strippedTransition && lexiconHits.length === 0) {
      continue;
    }

    const wc = words(next).length;
    const kind: SuggestionKind =
      wc < 8 || next.length < 24 ? "hollow" : strippedTransition && hits.length >= 1 ? "cadence" : "cliche";

    const rewrite = kind === "hollow" ? "" : next === span.text ? span.text : next;

    out.push({
      id: `sug-${span.start}`,
      kind,
      severity: severityOf(hits.length, strippedTransition, kind),
      start: span.start,
      end: span.end,
      excerpt: span.text,
      title: KIND_COPY[kind].title,
      issue: describe(hits, strippedTransition, kind),
      recommendation: KIND_COPY[kind].recommendation,
      rewrite,
      status: "open",
    });
  }

  return out;
}

export function mergeSuggestions(lists: Suggestion[][]): Suggestion[] {
  const rank: Record<SuggestionSeverity, number> = { high: 0, med: 1, low: 2 };
  const kindRank: Record<SuggestionKind, number> = {
    artifact: 0,
    citation: 1,
    hollow: 2,
    cadence: 3,
    cliche: 4,
    punctuation: 5,
    paragraph: 1,
    word: 6,
  };
  const all = lists.flat();
  const wordsS = all
    .filter((s) => s.kind === "word")
    .sort((a, b) => rank[a.severity] - rank[b.severity] || a.start - b.start)
    .slice(0, 14);
  const paras = all
    .filter((s) => s.kind === "paragraph")
    .sort((a, b) => rank[a.severity] - rank[b.severity] || a.start - b.start)
    .slice(0, 4);
  const rest = all.filter((s) => s.kind !== "word" && s.kind !== "paragraph");
  rest.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      kindRank[a.kind] - kindRank[b.kind] ||
      a.start - b.start,
  );
  const kept: Suggestion[] = [];
  for (const s of rest) {
    if (s.highlight === false || s.end <= s.start) {
      kept.push(s);
      continue;
    }
    const overlap = kept.some(
      (k) => k.highlight !== false && k.end > k.start && s.start < k.end && s.end > k.start,
    );
    if (overlap) continue;
    kept.push(s);
  }
  return [...paras, ...kept.slice(0, 18), ...wordsS];
}

export function applyRewriteToText(
  text: string,
  suggestion: Suggestion,
  rewriteOverride?: string,
): string {
  const insert = rewriteOverride ?? suggestion.rewrite;
  if (suggestion.replaceAll && suggestion.match) {
    return replaceAllWord(text, suggestion.match, insert);
  }
  if (suggestion.kind === "artifact" && insert) {
    return insert.trim();
  }
  if (suggestion.end <= suggestion.start) {
    return insert || text;
  }
  let next = text.slice(0, suggestion.start) + insert + text.slice(suggestion.end);
  next = next.replace(/[ \t]{2,}/g, " ");
  next = next.replace(/\n{3,}/g, "\n\n");
  next = next.replace(/ +\n/g, "\n");
  return next.trim();
}
