export type Label = "human" | "mixed" | "ai" | "unavailable" | "error";

export type EngineFamily =
  | "stylometry"
  | "statistical"
  | "zero-shot"
  | "supervised"
  | "rewrite"
  | "phd"
  | "forensic";

export interface EngineResult {
  id: string;
  name: string;
  family: EngineFamily;
  available: boolean;
  label: Label;
  aiScore: number | null;
  detail: Record<string, number | string>;
  citation: string;
  year: number;
  proxy: boolean;
  notes?: string;
}

export interface WindowScore {
  index: number;
  startWord: number;
  endWord: number;
  startChar: number;
  endChar: number;
  preview: string;
  aiScore: number;
  label: Label;
}

export interface PhdSignals {
  citationDensity: number;
  namedPriorWork: number;
  hedgeRate: number;
  clicheRate: number;
  notationDensity: number;
  limitationSpecificity: number;
  contributionSpecificity: number;
  firstPersonRate: number;
  sectionCoverage: string[];
}

export interface GeneratorGuess {
  model: string;
  lab: string;
  confidence: number;
  rationale: string;
}

export interface ForensicReport {
  aiScore: number;
  label: Label;
  verdict: string;
  likelyGenerators: GeneratorGuess[];
  flags: { code: string; severity: "low" | "med" | "high"; detail: string }[];
  caveats: string[];
}

export type SuggestionKind = "cliche" | "cadence" | "hollow" | "citation" | "artifact" | "punctuation" | "word" | "paragraph";
export type SuggestionSeverity = "high" | "med" | "low";
export type SuggestionStatus = "open" | "accepted" | "dismissed";

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  severity: SuggestionSeverity;
  start: number;
  end: number;
  excerpt: string;
  title: string;
  issue: string;
  recommendation: string;
  rewrite: string;
  status: SuggestionStatus;
  /** False for document-wide findings (hidden Unicode) so the page is not fully underlined. */
  highlight?: boolean;
  /** Extra word/sentence replacements the author can pick instead of `rewrite`. */
  alternatives?: string[];
  /** Replace every whole-word match of `match` (AI vocab). */
  replaceAll?: boolean;
  match?: string;
}

export type EvidenceLevel = "insufficient" | "human" | "uncertain" | "hybrid" | "machine";

export interface Evidence {
  level: EvidenceLevel;
  summary: string;
  reasons: string[];
  hotWindows: number;
  windowCount: number;
  styleShift: number;
  meanWindow: number;
}

export interface ArtifactHit {
  code: string;
  name: string;
  count: number;
  detail: string;
}

export interface ArtifactReport {
  count: number;
  zeroWidth: number;
  bidi: number;
  oddSpace: number;
  homoglyphs: number;
  kinds: ArtifactHit[];
}

export interface ScanReport {
  id: string;
  createdAt: string;
  title: string;
  source: string;
  sourceKind: "paste" | "arxiv" | "file" | "sample";
  text: string;
  wordCount: number;
  sentenceCount: number;
  results: EngineResult[];
  windows: WindowScore[];
  phd: PhdSignals;
  ensembleAiScore: number;
  ensembleLabel: Label;
  agreement: number;
  warnings: string[];
  forensic: ForensicReport | null;
  suggestions: Suggestion[];
  acceptedSkip: string[];
  evidence: Evidence;
  artifacts: ArtifactReport;
  /** GPTZero-style document mix, percent of words. */
  mix: { ai: number; mixed: number; human: number };
  /** FOCA-style PDF producer/creator, when the source was a file. */
  docMeta?: {
    title?: string;
    author?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    pageCount?: number;
    tell?: string;
  };
}

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  categories: string[];
  pdfUrl: string;
  absUrl: string;
  fullText?: string;
}
