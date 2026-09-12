export interface FrontierModel {
  id: string;
  name: string;
  lab: string;
  released: string;
  context: string;
  family: string;
  academicTell: string;
  status: "frontier" | "workhorse" | "open";
}

/** Snapshot of publicly discussed frontier systems as of September 2026. */
export const FRONTIER_MODELS: FrontierModel[] = [
  {
    id: "claude-fable-5.1",
    name: "Claude Fable 5.1",
    lab: "Anthropic",
    released: "2026-09-01",
    context: "1M",
    family: "Claude 5",
    academicTell:
      "Long, carefully hedged argumentative prose; dense caveats; slightly formal committee register.",
    status: "frontier",
  },
  {
    id: "gpt-6-astra",
    name: "GPT-6 Astra",
    lab: "OpenAI",
    released: "2026-09-03",
    context: "1.1M",
    family: "GPT-6",
    academicTell:
      "Fluent survey-style related work, polished transitions, high lexical evenness across sections.",
    status: "frontier",
  },
  {
    id: "claude-opus-5",
    name: "Claude Opus 5",
    lab: "Anthropic",
    released: "2026-07-24",
    context: "1M",
    family: "Claude 5",
    academicTell:
      "Methodical structure, explicit limitations, strong theorem/proof scaffolding when asked.",
    status: "frontier",
  },
  {
    id: "gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    lab: "OpenAI",
    released: "2026-07-09",
    context: "1M",
    family: "GPT-5.6",
    academicTell:
      "Agentic methods writeups; stepwise experimental protocols that read like runbooks.",
    status: "frontier",
  },
  {
    id: "gpt-5.5",
    name: "GPT-5.5",
    lab: "OpenAI",
    released: "2026-04",
    context: "1.1M",
    family: "GPT-5",
    academicTell:
      "Highly regular paragraph cadence and generic contribution bullets.",
    status: "workhorse",
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    lab: "Google",
    released: "2026-09-02",
    context: "1M",
    family: "Gemini 3",
    academicTell:
      "Broad literature stitching; citation-like name-drops without tight claims.",
    status: "workhorse",
  },
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    lab: "Google",
    released: "2026-02",
    context: "1M",
    family: "Gemini 3",
    academicTell:
      "Multimodal figure captions and tidy IMRaD templates.",
    status: "workhorse",
  },
  {
    id: "grok-4.6",
    name: "Grok 4.6",
    lab: "xAI",
    released: "2026-08-12",
    context: "500K",
    family: "Grok 4",
    academicTell:
      "Direct claims, fewer stacked transitions, occasional colloquial asides in otherwise formal text.",
    status: "frontier",
  },
  {
    id: "grok-4.5",
    name: "Grok 4.5",
    lab: "xAI",
    released: "2026-07-08",
    context: "500K",
    family: "Grok 4",
    academicTell:
      "Compressed explanations; less ornamental hedging than Claude-class text.",
    status: "workhorse",
  },
  {
    id: "deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    lab: "DeepSeek",
    released: "2026-09-10",
    context: "1M",
    family: "DeepSeek V4",
    academicTell:
      "Equation-heavy methods, terse related work, strong math register.",
    status: "open",
  },
  {
    id: "kimi-k3",
    name: "Kimi K3",
    lab: "Moonshot",
    released: "2026-04",
    context: "1M",
    family: "Kimi K",
    academicTell:
      "Long-context literature dumps; list-like coverage of prior art.",
    status: "open",
  },
  {
    id: "qwen-3.8-max",
    name: "Qwen3.8 Max",
    lab: "Alibaba",
    released: "2026",
    context: "1M",
    family: "Qwen3.8",
    academicTell:
      "Translation-smooth English with slightly generic collocations.",
    status: "open",
  },
  {
    id: "glm-5.3",
    name: "GLM-5.3",
    lab: "Zhipu",
    released: "2026",
    context: "1M",
    family: "GLM-5",
    academicTell:
      "Structured abstracts and evenly paced contribution lists.",
    status: "open",
  },
  {
    id: "muse-spark-1.3",
    name: "Muse Spark 1.3",
    lab: "Meta",
    released: "2026",
    context: "1M",
    family: "Muse",
    academicTell:
      "Open-weight survey tone; high n-gram overlap with web preprints.",
    status: "open",
  },
  {
    id: "claude-opus-4.8",
    name: "Claude Opus 4.8",
    lab: "Anthropic",
    released: "2026-05",
    context: "1M",
    family: "Claude 4",
    academicTell:
      "Earlier Claude-4 academic voice still common in 2025–26 dissertations.",
    status: "workhorse",
  },
];

export const DETECTOR_PAPERS = [
  {
    id: "stylometry",
    name: "Stylometry",
    family: "stylometry" as const,
    year: 2024,
    citation: "Classical authorship + LLM burstiness / TTR / hapax features",
    venue: "Surveyed in Computational Linguistics 2025",
    blurb:
      "Sentence-length variance, type-token ratio, hapax rate, and function-word mix. Still the most interpretable signal on dissertation-length prose.",
  },
  {
    id: "gltr",
    name: "GLTR ranks",
    family: "statistical" as const,
    year: 2019,
    citation: "Gehrmann, Strobelt & Rush, ACL 2019",
    venue: "ACL 2019",
    blurb:
      "Token rank visualization: machines prefer head-of-distribution words. We rank against a compact academic English list as a browser-side stand-in.",
  },
  {
    id: "zippy",
    name: "Zippy / compressibility",
    family: "statistical" as const,
    year: 2023,
    citation: "Thinkst, 2023 — LZMA compressibility detector",
    venue: "Industry / OSS",
    blurb:
      "Machine text is smoother and more compressible than human dissertation prose. We score n-gram repetition plus character entropy.",
  },
  {
    id: "detectgpt",
    name: "DetectGPT curvature",
    family: "zero-shot" as const,
    year: 2023,
    citation: "Mitchell et al., ICML 2023",
    venue: "ICML 2023",
    blurb:
      "Generated passages sit in negative log-probability curvature. Proxy: original vs synonym-perturbed typicality.",
  },
  {
    id: "fast-detectgpt",
    name: "Fast-DetectGPT",
    family: "zero-shot" as const,
    year: 2024,
    citation: "Bao et al., ICLR 2024",
    venue: "ICLR 2024",
    blurb:
      "Conditional probability curvature without T5 perturbations — ~340× faster than DetectGPT. Proxy uses local n-gram continuation surprise.",
  },
  {
    id: "binoculars",
    name: "Binoculars",
    family: "zero-shot" as const,
    year: 2024,
    citation: "Hans et al., ICML 2024",
    venue: "ICML 2024",
    blurb:
      "Cross-perplexity of two observers (performer vs observer). Proxy contrasts character-level vs word-level entropy.",
  },
  {
    id: "radar",
    name: "RADAR",
    family: "supervised" as const,
    year: 2023,
    citation: "Hu, Chen & Mower, NeurIPS 2023 (IBM)",
    venue: "NeurIPS 2023",
    blurb:
      "Adversarially trained against paraphrasers. Proxy: whether AI-like features survive a synonym paraphrase.",
  },
  {
    id: "ghostbuster",
    name: "Ghostbuster",
    family: "supervised" as const,
    year: 2024,
    citation: "Verma et al., NAACL 2024",
    venue: "NAACL 2024",
    blurb:
      "Features from weaker language models, then a linear classifier. We ensemble cheap stylometric weak learners with published-style weights.",
  },
  {
    id: "dna-gpt",
    name: "DNA-GPT",
    family: "rewrite" as const,
    year: 2024,
    citation: "Yang et al., 2024",
    venue: "2024",
    blurb:
      "Continuation divergence: regenerate the tail and compare n-grams. Optional live pass via Grok.",
  },
  {
    id: "raidar",
    name: "RAIDAR / D&R",
    family: "rewrite" as const,
    year: 2026,
    citation: "Mao et al. 2024; Sun et al., ICLR 2026 (D&R)",
    venue: "ICLR 2026",
    blurb:
      "Rewrite-and-recover: machines rewrite their own text with smaller deltas. D&R (ICLR 2026) is SOTA with one black-box call on long text (AUROC ~0.96).",
  },
  {
    id: "glimpse",
    name: "Glimpse",
    family: "zero-shot" as const,
    year: 2025,
    citation: "Bao et al., ICLR 2025",
    venue: "ICLR 2025",
    blurb:
      "Estimates full next-token distributions from partial API logits — used conceptually in the live forensic pass.",
  },
  {
    id: "phd-register",
    name: "PhD register",
    family: "phd" as const,
    year: 2026,
    citation: "Paper Spotter — dissertation-specific feature set",
    venue: "This toolkit",
    blurb:
      "Citation density, named prior work, limitation specificity, hollow contributions, notation, and AI-academic clichés tuned on thesis prose — not essays.",
  },
  {
    id: "grok-forensic",
    name: "Grok 4.5 committee",
    family: "forensic" as const,
    year: 2026,
    citation: "Live xAI Grok 4.5 forensic read",
    venue: "xAI API",
    blurb:
      "Faculty-style close reading: generator attribution against the September 2026 frontier list, section flags, and a written verdict. User-initiated.",
  },
];
