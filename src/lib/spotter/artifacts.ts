import type { ArtifactHit, ArtifactReport, Suggestion } from "./types.ts";

/** Humanizer / watermark leftovers commonly seen in 2025–26 detector tests. */
const ZERO_WIDTH =
  /[\u200B\u200C\u200D\u2060\uFEFF\u180E\u2062\u2063\u2064\u034F]/g;
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;
const SOFT_HYPHEN = /\u00AD/g;
const ODD_SPACE = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;

/** Cyrillic / Greek letters that impersonate Latin in English prose. */
const HOMOGLYPH: Record<string, string> = {
  "\u0430": "a",
  "\u0435": "e",
  "\u043E": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0445": "x",
  "\u0456": "i",
  "\u04BB": "h",
  "\u0443": "y",
  "\u043A": "k",
  "\u0410": "A",
  "\u0412": "B",
  "\u0415": "E",
  "\u041A": "K",
  "\u041C": "M",
  "\u041D": "H",
  "\u041E": "O",
  "\u0420": "P",
  "\u0421": "C",
  "\u0425": "X",
  "\u0391": "A",
  "\u0392": "B",
  "\u0395": "E",
  "\u039A": "K",
  "\u039C": "M",
  "\u039D": "N",
  "\u039F": "O",
  "\u03A1": "P",
  "\u03A7": "X",
  "\u03BF": "o",
};

function countRe(text: string, re: RegExp): number {
  const copy = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  return (text.match(copy) ?? []).length;
}

function homoglyphHits(text: string): { index: number; ch: string; latin: string }[] {
  const out: { index: number; ch: string; latin: string }[] = [];
  for (let i = 0; i < text.length; i++) {
    const latin = HOMOGLYPH[text[i]];
    if (latin) out.push({ index: i, ch: text[i], latin });
  }
  return out;
}

export function scanArtifacts(text: string): ArtifactReport {
  const zeroWidth = countRe(text, ZERO_WIDTH);
  const bidi = countRe(text, BIDI);
  const softHyphen = countRe(text, SOFT_HYPHEN);
  const oddSpace = countRe(text, ODD_SPACE);
  const glyphs = homoglyphHits(text);
  const kinds: ArtifactHit[] = [];
  if (zeroWidth) {
    kinds.push({
      code: "zero-width",
      name: "Zero-width / word-joiner",
      count: zeroWidth,
      detail: "U+200B/C/D, BOM, word joiners — used by some humanizers and copy-paste watermarks.",
    });
  }
  if (bidi) {
    kinds.push({
      code: "bidi",
      name: "Bidirectional override",
      count: bidi,
      detail: "Hidden direction marks. Not typical in a thesis chapter.",
    });
  }
  if (softHyphen) {
    kinds.push({
      code: "soft-hyphen",
      name: "Soft hyphen",
      count: softHyphen,
      detail: "Invisible hyphenation points that survive paste.",
    });
  }
  if (oddSpace) {
    kinds.push({
      code: "odd-space",
      name: "Non-breaking / unicode space",
      count: oddSpace,
      detail: "NBSP and unicode spaces instead of ASCII 0x20.",
    });
  }
  if (glyphs.length) {
    kinds.push({
      code: "homoglyph",
      name: "Homoglyph (look-alike letter)",
      count: glyphs.length,
      detail: "Cyrillic or Greek letters impersonating Latin (e.g. U+0430 for ‘a’). A known detector-evasion trick.",
    });
  }
  return {
    count: kinds.reduce((n, k) => n + k.count, 0),
    zeroWidth,
    bidi,
    oddSpace,
    homoglyphs: glyphs.length,
    kinds,
  };
}

export function stripArtifacts(text: string): string {
  let next = text
    .replace(ZERO_WIDTH, "")
    .replace(BIDI, "")
    .replace(SOFT_HYPHEN, "")
    .replace(ODD_SPACE, " ");
  next = [...next].map((ch) => HOMOGLYPH[ch] ?? ch).join("");
  return next;
}

export function artifactSuggestions(text: string): Suggestion[] {
  const report = scanArtifacts(text);
  if (report.count === 0) return [];
  const bits = report.kinds.map((k) => `${k.count}× ${k.name.toLowerCase()}`);
  return [
    {
      id: "art-0",
      kind: "artifact",
      severity: report.bidi || report.homoglyphs ? "high" : "med",
      start: 0,
      end: 0,
      excerpt: bits.join("; "),
      title: "Hidden characters",
      issue: `Found ${report.count} invisible or look-alike characters (${bits.join(", ")}). Models rarely inject these; humanizer tools and some paste pipelines do.`,
      recommendation:
        "Strip them, then re-score. Hidden Unicode is not itself proof of AI — it is a processing artifact worth cleaning before a committee read.",
      rewrite: stripArtifacts(text),
      status: "open",
      highlight: false,
    },
  ];
}
