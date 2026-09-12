import { mean, stdev } from "./text.ts";
import type { ArtifactReport, Evidence, EvidenceLevel, ScanReport, WindowScore } from "./types.ts";

export function assessEvidence(input: {
  wordCount: number;
  ensembleAiScore: number;
  agreement: number;
  windows: WindowScore[];
  artifacts: ArtifactReport;
  openFlags: number;
}): Evidence {
  const { wordCount, ensembleAiScore, agreement, windows, artifacts, openFlags } = input;
  const scores = windows.map((w) => w.aiScore);
  const hotWindows = windows.filter((w) => w.aiScore >= 0.6).length;
  const coldWindows = windows.filter((w) => w.aiScore <= 0.4).length;
  const styleShift = scores.length >= 2
    ? Math.max(0, ...scores.slice(1).map((s, i) => Math.abs(s - scores[i])))
    : 0;
  const hybrid =
    windows.length >= 2 &&
    hotWindows >= 1 &&
    coldWindows >= 1 &&
    (styleShift >= 0.22 || (hotWindows >= 1 && coldWindows >= 1 && windows.length >= 3));

  const reasons: string[] = [];
  let level: EvidenceLevel = "uncertain";

  if (wordCount < 80) {
    level = "insufficient";
    reasons.push("Under 80 words — commercial detectors refuse or explode in false-positive rate here (Pangram / GPTZero 2026).");
  } else if (wordCount < 150) {
    level = "uncertain";
    reasons.push("Under 150 words. Independent tests put human false-positives ~10× higher on this length.");
  } else if (hybrid) {
    level = "hybrid";
    reasons.push(
      `${hotWindows} of ${windows.length} windows look machine-like next to human-like patches — the pattern in mixed dissertations (EdD 2026; Pangram windowing on arXiv/NBER).`,
    );
  } else if (ensembleAiScore >= 0.62 && agreement >= 0.5 && wordCount >= 150) {
    level = "machine";
    reasons.push("Several independent proxies agree on the 2025–26 academic-LLM register.");
  } else if (ensembleAiScore <= 0.38 && agreement >= 0.45 && openFlags <= 2) {
    level = "human";
    reasons.push("Low ensemble score, low cliché density, no abrupt style shift.");
  } else {
    level = "uncertain";
    reasons.push("Engines disagree or the signal is moderate. Treat as unscored — not ‘cleared’ and not ‘caught’.");
  }

  if (artifacts.count > 0) {
    reasons.push(
      `${artifacts.count} hidden/look-alike characters. Strip before a committee read; they are a processing tell, not a verdict.`,
    );
  }
  if (wordCount >= 150 && scores.length >= 3) {
    const spread = stdev(scores);
    if (spread >= 0.18) {
      reasons.push(`Window spread ${spread.toFixed(2)} — do not trust a single document-level percentage.`);
    }
  }

  const summary = summaryOf(level, wordCount, hotWindows, windows.length, openFlags);
  return {
    level,
    summary,
    reasons,
    hotWindows,
    windowCount: windows.length,
    styleShift: Number(styleShift.toFixed(3)),
    meanWindow: Number(mean(scores).toFixed(3)),
  };
}

function summaryOf(
  level: EvidenceLevel,
  words: number,
  hot: number,
  nWin: number,
  flags: number,
): string {
  if (level === "insufficient") return "Too short to score.";
  if (level === "human") return "No strong machine signal on this excerpt.";
  if (level === "hybrid") {
    return `Mixed document: ${hot} of ${nWin} passages look machine-like.`;
  }
  if (level === "machine") {
    return `${flags} sentence-level tells; engines agree this is the academic-LLM register.`;
  }
  return `Uncertain — ${words.toLocaleString()} words, ${flags} flags. Not a verdict.`;
}

export function reportMarkdown(scan: ScanReport): string {
  const open = (scan.suggestions ?? []).filter((s) => s.status === "open");
  const ev = scan.evidence;
  const lines = [
    `# Paper Spotter review`,
    ``,
    `**${scan.title}**`,
    `${scan.sourceKind} · ${scan.wordCount.toLocaleString()} words · ${scan.sentenceCount} sentences`,
    `Scanned ${scan.createdAt.slice(0, 10)}`,
    ``,
    `## Evidence`,
    `${ev?.summary ?? "Unscored"}`,
    ``,
    `- Level: **${ev?.level ?? "uncertain"}**`,
    `- Ensemble machine-like: ${Math.round(scan.ensembleAiScore * 100)}% (agreement ${Math.round(scan.agreement * 100)}%)`,
    `- Hot windows: ${ev?.hotWindows ?? 0} / ${ev?.windowCount ?? scan.windows.length}`,
    `- Style shift: ${ev?.styleShift ?? 0}`,
    `- Open recommendations: ${open.length}`,
    ``,
    `## Why`,
    ...(ev?.reasons ?? []).map((r) => `- ${r}`),
    ``,
    `## Engines`,
    ...scan.results.map(
      (r) =>
        `- ${r.name}: ${r.aiScore == null ? "—" : `${Math.round(r.aiScore * 100)}%`} ${r.proxy ? "(browser proxy)" : ""}`,
    ),
    ``,
  ];
  if (scan.artifacts?.count) {
    lines.push(`## Hidden characters`, ``);
    for (const k of scan.artifacts.kinds) {
      lines.push(`- ${k.name}: ${k.count} — ${k.detail}`);
    }
    lines.push(``);
  }
  if (open.length) {
    lines.push(`## Recommendations`, ``);
    for (const s of open) {
      lines.push(`### ${s.title} (${s.severity})`);
      lines.push(s.issue);
      lines.push(`> ${s.excerpt}`);
      if (s.rewrite && s.kind !== "artifact" && s.rewrite !== s.excerpt) {
        lines.push(`Try: ${s.rewrite}`);
      }
      lines.push(``);
    }
  }
  lines.push(
    `## Caveat`,
    ``,
    `Signals, not proof. Hybrid and “humanized” text is where every 2026 detector degrades (Studies in Educational Evaluation 90, 2026). Do not treat this file as a judicial finding.`,
    ``,
  );
  return lines.join("\n");
}
