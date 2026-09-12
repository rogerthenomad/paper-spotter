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

export type SuggestionKind = "cliche" | "cadence" | "hollow";
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
