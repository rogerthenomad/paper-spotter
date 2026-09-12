import { sentenceSpans } from "./suggestions.ts";
import { vocabDensity } from "./vocab.ts";
import { words } from "./text.ts";
import type { Suggestion, WindowScore } from "./types.ts";

export function mixShare(
  text: string,
  suggestions: Suggestion[],
  windows: WindowScore[],
): { ai: number; mixed: number; human: number } {
  const spans = sentenceSpans(text);
  if (spans.length === 0) return { ai: 0, mixed: 0, human: 100 };
  let aiW = 0;
  let mixW = 0;
  let humW = 0;
  for (const sp of spans) {
    const wc = Math.max(words(sp.text).length, 1);
    const flagged = suggestions.some(
      (s) =>
        s.status === "open" &&
        s.kind !== "word" &&
        s.kind !== "artifact" &&
        s.end > s.start &&
        s.start < sp.end &&
        s.end > sp.start,
    );
    const win = windows.find((w) => w.startChar <= sp.start && w.endChar >= Math.min(sp.end, w.endChar));
    const score = win?.aiScore ?? (flagged ? 0.7 : vocabDensity(sp.text) * 8);
    if (flagged && score >= 0.55) aiW += wc;
    else if (flagged || score >= 0.48) mixW += wc;
    else humW += wc;
  }
  const t = aiW + mixW + humW || 1;
  const ai = Math.round((100 * aiW) / t);
  const mixed = Math.round((100 * mixW) / t);
  let human = 100 - ai - mixed;
  if (human < 0) {
    return { ai, mixed: Math.max(0, 100 - ai), human: 0 };
  }
  return { ai, mixed, human };
}
