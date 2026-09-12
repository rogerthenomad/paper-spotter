/** Ranked common English (approx. 1 = most frequent). Used as a GLTR stand-in. */
export const COMMON_RANK: Record<string, number> = Object.fromEntries(
  (
    "the of and to a in is that for it as with on be by this are from at or an " +
    "was not have which you were their they we has but can one all been more " +
    "when if there her his also than into its other some no such only first " +
    "after new most any these two may many then so what about up out who do " +
    "well over would time very our even where just those people work life way " +
    "because through each year both under own should still between few while " +
    "same another being against during without much before must however using " +
    "used based data results method methods model models paper study analysis " +
    "proposed approach proposed show shown figure table section appendix given " +
    "consider let thus hence therefore moreover furthermore additionally finally " +
    "respectively corresponding obtained observed found present current previous " +
    "existing related different various several including following according " +
    "significant important high low large small number value values function " +
    "set training test performance accuracy problem information system process " +
    "research work authors et al we our this these those"
  )
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => [w, i + 1]),
);

export const FUNCTION_WORDS = new Set(
  (
    "the of and to a in is that for it as with on be by this are from at or an " +
    "was not have which you were their they we has but can one all been more " +
    "when if there her his also than into its other some no such only first " +
    "after would our even where just those because through each both under own " +
    "should still between few while same another being against during without " +
    "much before must"
  ).split(/\s+/),
);

export const AI_CLICHES: { phrase: string; weight: number }[] = [
  { phrase: "delve", weight: 1.4 },
  { phrase: "delves", weight: 1.4 },
  { phrase: "delving", weight: 1.4 },
  { phrase: "tapestry", weight: 1.6 },
  { phrase: "landscape of", weight: 1.1 },
  { phrase: "in the realm of", weight: 1.5 },
  { phrase: "it is important to note", weight: 1.3 },
  { phrase: "it's important to note", weight: 1.3 },
  { phrase: "it is worth noting", weight: 1.2 },
  { phrase: "a comprehensive overview", weight: 1.2 },
  { phrase: "this paper aims to", weight: 0.9 },
  { phrase: "in today's rapidly", weight: 1.5 },
  { phrase: "rapidly evolving", weight: 1.1 },
  { phrase: "play a crucial role", weight: 1.2 },
  { phrase: "plays a crucial role", weight: 1.2 },
  { phrase: "plays a pivotal role", weight: 1.3 },
  { phrase: "pivotal role", weight: 1.0 },
  { phrase: "underscores the", weight: 1.2 },
  { phrase: "underscore the", weight: 1.2 },
  { phrase: "shedding light", weight: 1.2 },
  { phrase: "sheds light", weight: 1.1 },
  { phrase: "a testament to", weight: 1.3 },
  { phrase: "not only", weight: 0.4 },
  { phrase: "but also", weight: 0.4 },
  { phrase: "holistic", weight: 0.9 },
  { phrase: "multifaceted", weight: 1.1 },
  { phrase: "paradigm shift", weight: 1.0 },
  { phrase: "cutting-edge", weight: 0.8 },
  { phrase: "we propose a novel", weight: 1.0 },
  { phrase: "addresses this gap", weight: 1.1 },
  { phrase: "fill this gap", weight: 1.0 },
  { phrase: "remains an open challenge", weight: 1.1 },
  { phrase: "to the best of our knowledge", weight: 0.8 },
  { phrase: "significantly enhances", weight: 1.1 },
  { phrase: "paves the way", weight: 1.3 },
  { phrase: "a growing body of", weight: 1.0 },
  { phrase: "has garnered significant", weight: 1.4 },
  { phrase: "garnered considerable", weight: 1.3 },
  { phrase: "in conclusion", weight: 0.7 },
  { phrase: "robust framework", weight: 0.9 },
  { phrase: "leverage", weight: 0.6 },
  { phrase: "leveraging", weight: 0.6 },
  { phrase: "utilize", weight: 0.4 },
  { phrase: "utilizing", weight: 0.5 },
  { phrase: "facilitates", weight: 0.6 },
  { phrase: "showcasing", weight: 1.0 },
  { phrase: "groundbreaking", weight: 1.0 },
  { phrase: "intricate interplay", weight: 1.5 },
  { phrase: "rich tapestry", weight: 1.8 },
  { phrase: "ever-evolving", weight: 1.3 },
  { phrase: "it is evident that", weight: 1.1 },
  { phrase: "the aforementioned", weight: 0.8 },
  { phrase: "in this paper we", weight: 0.5 },
  { phrase: "the remainder of this paper", weight: 0.7 },
  { phrase: "as an illustrative example", weight: 0.8 },
  { phrase: "a wide range of", weight: 0.5 },
  { phrase: "in recent years", weight: 0.6 },
  { phrase: "has attracted considerable attention", weight: 1.3 },
];

export const TRANSITION_STACK = [
  "furthermore",
  "moreover",
  "additionally",
  "consequently",
  "therefore",
  "hence",
  "thus",
  "nevertheless",
  "nonetheless",
  "meanwhile",
  "subsequently",
  "accordingly",
];

export const HEDGES = [
  "may",
  "might",
  "could",
  "suggests",
  "appears",
  "seems",
  "likely",
  "possibly",
  "perhaps",
  "approximately",
  "relatively",
  "somewhat",
  "arguably",
  "putative",
  "tentative",
];

export const HUMAN_MARKERS = [
  "we failed",
  "did not replicate",
  "failed to replicate",
  "unexpectedly",
  "to our surprise",
  "anecdotal",
  "we abandoned",
  "abandoned it",
  "could not",
  "remains unclear why",
  "we do not claim",
  "a limitation of this",
  "this is not",
  "contra ",
  "cf.",
  "see however",
  "unpublished",
  "in our hands",
  "we suspect",
  "awkwardly",
  "admittedly",
  "the referee",
  "after several attempts",
  "the logs are ugly",
  "we have not cleaned",
  "picked by hand",
  "i do not have a proof",
  "i am unhappy",
  "missing factor",
  "that did not survive",
  "collapsed at",
];

export const CITATION_RES = [
  /\([A-Z][A-Za-z-]+ et al\.,?\s*\d{4}[a-z]?\)/g,
  /\([A-Z][A-Za-z-]+ &\s*[A-Z][A-Za-z-]+,?\s*\d{4}[a-z]?\)/g,
  /\([A-Z][A-Za-z-]+,?\s*\d{4}[a-z]?\)/g,
  /\[(?:\d{1,3}\s*,\s*)*\d{1,3}\]/g,
  /\b(?:19|20)\d{2}[a-z]?\b/g,
];

export const NAMED_PRIOR =
  /\b(?:BERT|GPT-2|GPT-3|GPT-4|LLaMA|ResNet|ImageNet|CIFAR|Transformer|Attention is All|AdamW|BLEU|ROUGE|MMLU|ImageNet|WikiText|C4|The Pile|arXiv|NeurIPS|ICML|ICLR|ACL|CVPR|AAAI|JMLR|Nature|Science|PNAS)\b/g;

export const NOTATION_RE =
  /(?:\$[^$]+\$)|(?:\\[a-zA-Z]+\{)|(?:\b[a-zA-Z]\s*=\s*)|(?:O\([^)]+\))|(?:\b(?:Theorem|Lemma|Corollary|Proposition|Definition|Remark)\s+\d)/g;

export const SYNONYM_SWAP: Record<string, string> = {
  show: "demonstrate",
  demonstrate: "show",
  use: "employ",
  employ: "use",
  method: "approach",
  approach: "method",
  result: "finding",
  finding: "result",
  important: "significant",
  significant: "important",
  model: "system",
  system: "model",
  paper: "work",
  work: "study",
  study: "paper",
  increase: "improve",
  improve: "increase",
  propose: "introduce",
  introduce: "propose",
};
