import type { Label } from "./types";

const SENTENCE_RE = /(?<=[.!?])\s+(?=[A-Z“"(\[])/;
const WORD_RE = /\b[\p{L}\p{N}']+\b/gu;

export function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sentences(text: string): string[] {
  const n = normalize(text);
  if (!n) return [];
  const parts = n.split(SENTENCE_RE);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function words(text: string): string[] {
  return normalize(text).match(WORD_RE) ?? [];
}

export function lowerWords(text: string): string[] {
  return words(text).map((w) => w.toLowerCase());
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

export function uniqueRatio(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

export function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export function wordSpans(text: string): { start: number; end: number; word: string }[] {
  const re = new RegExp(WORD_RE.source, WORD_RE.flags);
  const out: { start: number; end: number; word: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
  }
  return out;
}

/** Adaptive windows: 300-word Pangram/NBER size on long chapters, finer on excerpts. */
export function windowSpec(wordCount: number): { size: number; overlap: number } {
  if (wordCount >= 1200) return { size: 300, overlap: 50 };
  if (wordCount >= 360) return { size: 180, overlap: 40 };
  if (wordCount >= 160) return { size: 90, overlap: 20 };
  return { size: Math.max(wordCount, 40), overlap: 0 };
}

export function chunkByWords(
  text: string,
  chunkWords?: number,
  overlap?: number,
): { start: number; end: number; startChar: number; endChar: number; text: string }[] {
  const spans = wordSpans(text);
  if (spans.length === 0) return [];
  const spec = windowSpec(spans.length);
  const size = chunkWords ?? spec.size;
  const ov = overlap ?? spec.overlap;
  const chunks: { start: number; end: number; startChar: number; endChar: number; text: string }[] = [];
  let i = 0;
  while (i < spans.length) {
    const j = Math.min(spans.length, i + size);
    const startChar = spans[i].start;
    const endChar = spans[j - 1].end;
    chunks.push({
      start: i,
      end: j,
      startChar,
      endChar,
      text: text.slice(startChar, endChar),
    });
    if (j >= spans.length) break;
    i = Math.max(i + size - ov, i + 1);
  }
  return chunks;
}

export function labelFromScore(score: number | null): Label {
  if (score == null) return "unavailable";
  if (score < 0.38) return "human";
  if (score < 0.58) return "mixed";
  return "ai";
}

export function charEntropy(text: string): number {
  if (!text) return 0;
  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  const n = text.length;
  for (const c of freq.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}
