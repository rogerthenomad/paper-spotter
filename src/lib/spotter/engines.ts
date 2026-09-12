import {
  AI_CLICHES,
  CITATION_RES,
  COMMON_RANK,
  HEDGES,
  HUMAN_MARKERS,
  NAMED_PRIOR,
  NOTATION_RE,
  SYNONYM_SWAP,
  TRANSITION_STACK,
} from "./lexicon";
import type { EngineResult, Label, PhdSignals, WindowScore } from "./types";
import {
  charEntropy,
  chunkByWords,
  clamp01,
  labelFromScore,
  lowerWords,
  mean,
  ngrams,
  sentences,
  stdev,
  uniqueRatio,
  words,
} from "./text";

function yulesK(tokens: string[]): number {
  const n = tokens.length;
  if (n < 20) return 50;
  const freq = new Map<string, number>();
  for (const w of tokens) freq.set(w, (freq.get(w) ?? 0) + 1);
  let sumSq = 0;
  for (const c of freq.values()) sumSq += c * c;
  return (10000 * (sumSq - n)) / (n * n);
}

function transitionRate(text: string): number {
  return countHits(text, TRANSITION_STACK) / Math.max(sentences(text).length, 1);
}

function dropWords(text: string, every = 6): string {
  let i = 0;
  return text.replace(/\b[\p{L}\p{N}']+\b/gu, (w) => {
    i += 1;
    return i % every === 0 ? "" : w;
  });
}

function countHits(hay: string, needles: string[]): number {
  const t = hay.toLowerCase();
  let n = 0;
  for (const p of needles) {
    let i = 0;
    while (true) {
      const j = t.indexOf(p, i);
      if (j < 0) break;
      n += 1;
      i = j + p.length;
    }
  }
  return n;
}

function clicheScore(text: string): { score: number; hits: number } {
  const t = text.toLowerCase();
  let w = 0;
  let hits = 0;
  for (const c of AI_CLICHES) {
    if (t.includes(c.phrase)) {
      hits += 1;
      w += c.weight;
    }
  }
  const perK = (w / Math.max(words(text).length, 1)) * 1000;
  return { score: clamp01(perK / 8), hits };
}

function rankMass(tokens: string[]): { top10: number; top100: number; tail: number } {
  let top10 = 0;
  let top100 = 0;
  let ranked = 0;
  for (const w of tokens) {
    const r = COMMON_RANK[w];
    if (r == null) continue;
    ranked += 1;
    if (r <= 10) top10 += 1;
    if (r <= 100) top100 += 1;
  }
  const n = Math.max(ranked, 1);
  return { top10: top10 / n, top100: top100 / n, tail: 1 - top100 / n };
}

function paraphrase(text: string): string {
  return text.replace(/\b[A-Za-z']+\b/g, (w) => {
    const key = w.toLowerCase();
    const swap = SYNONYM_SWAP[key];
    if (!swap) return w;
    return w[0] === w[0].toUpperCase()
      ? swap[0].toUpperCase() + swap.slice(1)
      : swap;
  });
}

function typicality(text: string): number {
  const toks = lowerWords(text);
  if (toks.length < 8) return 0.5;
  const bi = ngrams(toks, 2);
  const tri = ngrams(toks, 3);
  const biU = uniqueRatio(bi);
  const triU = uniqueRatio(tri);
  const ranks = rankMass(toks);
  // Lower uniqueness + higher head-mass = more typical / machine-like.
  return clamp01(0.45 * (1 - biU) + 0.25 * (1 - triU) + 0.3 * ranks.top10);
}

function engine(
  id: string,
  name: string,
  family: EngineResult["family"],
  year: number,
  citation: string,
  aiScore: number,
  detail: Record<string, number | string>,
  proxy: boolean,
  notes?: string,
): EngineResult {
  const score = clamp01(aiScore);
  return {
    id,
    name,
    family,
    available: true,
    label: labelFromScore(score),
    aiScore: score,
    detail,
    citation,
    year,
    proxy,
    notes,
  };
}

export function stylometryEngine(text: string): EngineResult {
  const sents = sentences(text);
  const toks = lowerWords(text);
  const lens = sents.map((s) => words(s).length).filter((n) => n > 0);
  const burst = lens.length ? stdev(lens) / Math.max(mean(lens), 1) : 0;
  const ttr = uniqueRatio(toks);
  const k = yulesK(toks);
  const trans = transitionRate(text);
  const cl = clicheScore(text).score;
  const wordLens = toks.map((w) => w.length);
  const wlCv = stdev(wordLens) / Math.max(mean(wordLens), 1);

  // Length-invariant: Yule's K (repetition) + burstiness + tells. Raw TTR lies on short text.
  const ai =
    0.28 * clamp01((k - 80) / 140) +
    0.22 * clamp01((0.72 - burst) / 0.5) +
    0.28 * cl +
    0.14 * clamp01(trans / 0.22) +
    0.08 * clamp01((0.22 - wlCv) / 0.15);

  return engine(
    "stylometry",
    "Stylometry",
    "stylometry",
    2024,
    "Burstiness, Yule's K, academic tells",
    ai,
    {
      burstiness: Number(burst.toFixed(3)),
      ttr: Number(ttr.toFixed(3)),
      yulesK: Number(k.toFixed(1)),
      meanSentence: Number(mean(lens).toFixed(2)),
      transitions: Number(trans.toFixed(3)),
    },
    false,
  );
}

export function gltrEngine(text: string): EngineResult {
  const toks = lowerWords(text);
  const mass = rankMass(toks);
  const ai = clamp01((mass.top10 - 0.22) / 0.28 + (mass.top100 - 0.55) / 0.5) * 0.7 +
    0.3 * clamp01((mass.top10 - 0.18) / 0.35);
  return engine(
    "gltr",
    "GLTR ranks",
    "statistical",
    2019,
    "Gehrmann, Strobelt & Rush, ACL 2019",
    ai,
    {
      top10: Number(mass.top10.toFixed(3)),
      top100: Number(mass.top100.toFixed(3)),
      tail: Number(mass.tail.toFixed(3)),
    },
    true,
    "Ranked against a compact academic English list (browser stand-in for GPT-2 ranks).",
  );
}

export function zippyEngine(text: string): EngineResult {
  const toks = lowerWords(text);
  const k = yulesK(toks);
  const cl = clicheScore(text).score;
  const trans = transitionRate(text);
  const ent = charEntropy(text.replace(/\s+/g, " "));
  const ai =
    0.34 * clamp01((k - 70) / 150) +
    0.28 * cl +
    0.2 * clamp01(trans / 0.22) +
    0.18 * clamp01((4.4 - ent) / 0.8);
  return engine(
    "zippy",
    "Zippy / compressibility",
    "statistical",
    2023,
    "Thinkst 2023 (LZMA) — Yule's K + entropy proxy",
    ai,
    {
      yulesK: Number(k.toFixed(1)),
      charEntropy: Number(ent.toFixed(3)),
      cliches: Number(cl.toFixed(3)),
    },
    true,
  );
}

export function detectGptEngine(text: string): EngineResult {
  const orig = typicality(text) * 0.55 + clicheScore(text).score * 0.45;
  const pert = typicality(dropWords(paraphrase(text))) * 0.55 + clicheScore(text).score * 0.25;
  const curvature = orig - pert;
  const ai = clamp01(0.42 + curvature * 1.8 + 0.35 * clicheScore(text).score);
  return engine(
    "detectgpt",
    "DetectGPT curvature",
    "zero-shot",
    2023,
    "Mitchell et al., ICML 2023",
    ai,
    {
      originalTypicality: Number(orig.toFixed(3)),
      perturbedTypicality: Number(pert.toFixed(3)),
      curvature: Number(curvature.toFixed(3)),
    },
    true,
    "Synonym-perturbation stand-in; original paper uses T5 + source-model log-prob.",
  );
}

export function fastDetectEngine(text: string): EngineResult {
  const toks = lowerWords(text);
  if (toks.length < 12) {
    return engine(
      "fast-detectgpt",
      "Fast-DetectGPT",
      "zero-shot",
      2024,
      "Bao et al., ICLR 2024",
      0.5,
      { note: "too short" },
      true,
    );
  }
  const bi = ngrams(toks, 2);
  const counts = new Map<string, Map<string, number>>();
  for (let i = 0; i < toks.length - 1; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    if (!counts.has(a)) counts.set(a, new Map());
    const inner = counts.get(a)!;
    inner.set(b, (inner.get(b) ?? 0) + 1);
  }
  let surprise = 0;
  let n = 0;
  for (let i = 0; i < toks.length - 1; i++) {
    const inner = counts.get(toks[i]);
    if (!inner) continue;
    const total = [...inner.values()].reduce((a, b) => a + b, 0);
    const p = (inner.get(toks[i + 1]) ?? 0) / Math.max(total, 1);
    surprise += -Math.log2(Math.max(p, 1e-6));
    n += 1;
  }
  const meanSurp = surprise / Math.max(n, 1);
  // Local self-model: machines are overconfident (low surprise under their own n-grams, but globally repetitive).
  const cl = clicheScore(text).score;
  const trans = transitionRate(text);
  const uni = uniqueRatio(bi);
  const ai = clamp01(
    0.28 * clamp01((2.4 - meanSurp) / 1.6) +
      0.22 * clamp01((0.78 - uni) / 0.4) +
      0.3 * cl +
      0.2 * clamp01(trans / 0.22),
  );
  return engine(
    "fast-detectgpt",
    "Fast-DetectGPT",
    "zero-shot",
    2024,
    "Bao et al., ICLR 2024",
    ai,
    {
      meanSurprise: Number(meanSurp.toFixed(3)),
      bigramUnique: Number(uni.toFixed(3)),
    },
    true,
    "Conditional n-gram curvature proxy; original uses sampling discrepancy on GPT-Neo/Falcon.",
  );
}

export function binocularsEngine(text: string): EngineResult {
  const toks = lowerWords(text);
  const wordEnt = charEntropy(toks.join(" "));
  const charEnt = charEntropy(text.replace(/\s/g, "").toLowerCase());
  const ratio = charEnt / Math.max(wordEnt, 1e-6);
  const ttr = uniqueRatio(toks);
  const cl = clicheScore(text).score;
  const trans = transitionRate(text);
  const ai = clamp01(
    0.28 * clamp01((1.35 - ratio) / 0.45) +
      0.18 * clamp01((0.5 - ttr) / 0.2) +
      0.32 * cl +
      0.22 * clamp01(trans / 0.22),
  );
  return engine(
    "binoculars",
    "Binoculars",
    "zero-shot",
    2024,
    "Hans et al., ICML 2024",
    ai,
    {
      charEntropy: Number(charEnt.toFixed(3)),
      wordEntropy: Number(wordEnt.toFixed(3)),
      ratio: Number(ratio.toFixed(3)),
    },
    true,
    "Entropy-ratio stand-in for Falcon observer/performer cross-perplexity.",
  );
}

export function radarEngine(text: string): EngineResult {
  const orig = typicality(text) * 0.6 + clicheScore(text).score * 0.4;
  const para = paraphrase(text);
  const after = typicality(para) * 0.6 + clicheScore(para).score * 0.4;
  // Robust AI signal survives paraphrase.
  const stable = 1 - Math.abs(orig - after);
  const ai = clamp01(0.55 * orig + 0.45 * (orig > 0.45 ? stable : 1 - stable));
  return engine(
    "radar",
    "RADAR",
    "supervised",
    2023,
    "Hu et al., NeurIPS 2023 (IBM)",
    ai,
    {
      original: Number(orig.toFixed(3)),
      paraphrased: Number(after.toFixed(3)),
      stability: Number(stable.toFixed(3)),
    },
    true,
    "Paraphrase-invariance proxy; original is an adversarially trained RoBERTa.",
  );
}

export function ghostbusterEngine(text: string): EngineResult {
  const sty = stylometryEngine(text).aiScore ?? 0.5;
  const gl = gltrEngine(text).aiScore ?? 0.5;
  const zp = zippyEngine(text).aiScore ?? 0.5;
  const cl = clicheScore(text).score;
  const trans = transitionRate(text);
  const weak = 0.12 * sty + 0.2 * gl + 0.08 * zp + 0.36 * cl + 0.24 * clamp01(trans / 0.22);
  return engine(
    "ghostbuster",
    "Ghostbuster",
    "supervised",
    2024,
    "Verma et al., NAACL 2024",
    weak,
    {
      stylometry: Number(sty.toFixed(3)),
      gltr: Number(gl.toFixed(3)),
      zippy: Number(zp.toFixed(3)),
      cliches: Number(cl.toFixed(3)),
      transitionRate: Number(trans.toFixed(3)),
    },
    true,
    "Weak-feature linear ensemble (original uses Ada/Davinci logprobs).",
  );
}

export function phdRegisterEngine(text: string): EngineResult {
  const phd = phdSignals(text);
  const trans = transitionRate(text);
  const humanBonus = phd.limitationSpecificity;
  const ai = clamp01(
    0.34 * phd.clicheRate +
      0.22 * clamp01(trans / 0.22) +
      0.14 * clamp01(1 - phd.citationDensity * 12) +
      0.12 * clamp01(1 - phd.namedPriorWork * 8) +
      0.1 * clamp01(1 - phd.notationDensity * 8) +
      0.08 * clamp01(phd.hedgeRate * 2) -
      0.22 * humanBonus,
  );
  return engine(
    "phd-register",
    "PhD register",
    "phd",
    2026,
    "Paper Spotter dissertation features",
    ai,
    {
      citationsPer100w: Number((phd.citationDensity * 100).toFixed(2)),
      namedPrior: Number(phd.namedPriorWork.toFixed(3)),
      cliches: Number(phd.clicheRate.toFixed(3)),
      limitations: Number(phd.limitationSpecificity.toFixed(3)),
      notation: Number(phd.notationDensity.toFixed(3)),
    },
    false,
    "Tuned for thesis chapters, not undergraduate essays.",
  );
}

export function phdSignals(text: string): PhdSignals {
  const toks = words(text);
  const n = Math.max(toks.length, 1);
  let cite = 0;
  for (const re of CITATION_RES) {
    const copy = new RegExp(re.source, re.flags);
    cite += (text.match(copy) ?? []).length;
  }
  const named = (text.match(NAMED_PRIOR) ?? []).length;
  const hedges = countHits(text, HEDGES);
  const cl = clicheScore(text);
  const notation = (text.match(NOTATION_RE) ?? []).length;
  const human = countHits(text, HUMAN_MARKERS);
  const first = countHits(text.toLowerCase(), [" we ", " our ", " i "]);
  const lower = text.toLowerCase();
  const sections = [
    "abstract",
    "introduction",
    "related work",
    "background",
    "methods",
    "methodology",
    "results",
    "discussion",
    "limitation",
    "conclusion",
    "appendix",
  ].filter((s) => lower.includes(s));

  return {
    citationDensity: cite / n,
    namedPriorWork: named / n,
    hedgeRate: hedges / n,
    clicheRate: cl.score,
    notationDensity: notation / n,
    limitationSpecificity: clamp01(human / 3),
    contributionSpecificity: clamp01(
      (named + notation) / 12 + (lower.includes("we show") ? 0.1 : 0),
    ),
    firstPersonRate: first / n,
    sectionCoverage: sections,
  };
}

export function windowScores(text: string): WindowScore[] {
  return chunkByWords(text, 160, 24).map((c, index) => {
    const sty = stylometryEngine(c.text).aiScore ?? 0.5;
    const cl = clicheScore(c.text).score;
    const zp = zippyEngine(c.text).aiScore ?? 0.5;
    const aiScore = clamp01(0.42 * sty + 0.32 * cl + 0.26 * zp);
    return {
      index,
      startWord: c.start,
      endWord: c.end,
      preview: c.text.slice(0, 140) + (c.text.length > 140 ? "…" : ""),
      aiScore,
      label: labelFromScore(aiScore),
    };
  });
}

export function runLocalEngines(text: string): EngineResult[] {
  return [
    stylometryEngine(text),
    gltrEngine(text),
    zippyEngine(text),
    detectGptEngine(text),
    fastDetectEngine(text),
    binocularsEngine(text),
    radarEngine(text),
    ghostbusterEngine(text),
    phdRegisterEngine(text),
  ];
}

export function ensembleOf(results: EngineResult[]): { score: number; agreement: number; label: Label } {
  const scores = results
    .map((r) => r.aiScore)
    .filter((s): s is number => s != null);
  if (scores.length === 0) return { score: 0.5, agreement: 0, label: "unavailable" };
  const weights: Record<string, number> = {
    stylometry: 1.1,
    "phd-register": 1.5,
    ghostbuster: 1.3,
    zippy: 0.75,
    gltr: 1.15,
    binoculars: 0.7,
    "fast-detectgpt": 0.7,
    detectgpt: 0.6,
    radar: 1.1,
  };
  let num = 0;
  let den = 0;
  for (const r of results) {
    if (r.aiScore == null) continue;
    const w = weights[r.id] ?? 1;
    num += w * r.aiScore;
    den += w;
  }
  const score = num / Math.max(den, 1e-6);
  const sd = stdev(scores);
  const agreement = clamp01(1 - sd / 0.45);
  return { score, agreement, label: labelFromScore(score) };
}
