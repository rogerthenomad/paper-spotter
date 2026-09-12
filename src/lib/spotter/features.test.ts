import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { artifactSuggestions, scanArtifacts, stripArtifacts } from "./artifacts.ts";
import { citationSuggestions } from "./citations.ts";
import { assessEvidence } from "./readiness.ts";
import { SAMPLE_PAPERS } from "./samples.ts";
import { applyRewriteToText, buildSuggestions, punctuationSuggestions } from "./suggestions.ts";
import { paragraphSuggestions } from "./paragraphs.ts";
import { replaceAllWord, vocabSuggestions } from "./vocab.ts";
import type { ArtifactReport, WindowScore } from "./types.ts";

const emptyArtifacts: ArtifactReport = {
  count: 0,
  zeroWidth: 0,
  bidi: 0,
  oddSpace: 0,
  homoglyphs: 0,
  kinds: [],
};

function win(aiScore: number, i: number): WindowScore {
  return {
    index: i,
    startWord: i * 90,
    endWord: i * 90 + 90,
    startChar: i * 400,
    endChar: i * 400 + 400,
    preview: "\u2026",
    aiScore,
    label: aiScore >= 0.58 ? "ai" : aiScore < 0.38 ? "human" : "mixed",
  };
}

describe("unicode artifacts", () => {
  it("finds zero-width and homoglyphs, then strips them", () => {
    const dirty = "The\u200B model uses \u0430 Latin lookalike.";
    const report = scanArtifacts(dirty);
    assert.ok(report.zeroWidth >= 1);
    assert.ok(report.homoglyphs >= 1);
    const clean = stripArtifacts(dirty);
    assert.equal(scanArtifacts(clean).count, 0);
    assert.match(clean, /a Latin lookalike/);
    const flags = artifactSuggestions(dirty);
    assert.equal(flags.length, 1);
    assert.equal(flags[0].kind, "artifact");
    assert.equal(flags[0].highlight, false);
  });
});

describe("citation integrity", () => {
  it("flags unsourced studies-have-shown", () => {
    const text =
      "Studies have shown that transformers generalize across a wide range of reasoning tasks. We then measure latency on the cluster.";
    const flags = citationSuggestions(text);
    assert.ok(flags.some((f) => f.kind === "citation"));
  });

  it("stays quiet when a named citation is present", () => {
    const text =
      "Vaswani et al. (2017) showed that self-attention replaces recurrence on WMT 2014.";
    const flags = citationSuggestions(text);
    assert.equal(flags.length, 0);
  });

  it("flags a future year", () => {
    const text =
      "Recent work (Nguyen et al., 2029) reports a 40% gain on the same split we use here.";
    const flags = citationSuggestions(text);
    assert.ok(flags.some((f) => /2029/.test(f.issue)));
  });
});

describe("punctuation tells", () => {
  it("flags stacked em dashes, not a single human dash", () => {
    const stacked =
      "The method \u2014 unlike prior work \u2014 also \u2014 surprisingly \u2014 fits on one GPU.";
    assert.ok(punctuationSuggestions(stacked).length >= 1);
    const human = SAMPLE_PAPERS.find((p) => p.id === "human-systems");
    assert.ok(human);
    assert.equal(punctuationSuggestions(human.text).length, 0);
  });
});

describe("evidence quality", () => {
  it("refuses to score very short text", () => {
    const ev = assessEvidence({
      wordCount: 40,
      ensembleAiScore: 0.8,
      agreement: 0.9,
      windows: [win(0.8, 0)],
      artifacts: emptyArtifacts,
      openFlags: 4,
    });
    assert.equal(ev.level, "insufficient");
  });

  it("marks hybrid windows as mixed chapters", () => {
    const ev = assessEvidence({
      wordCount: 400,
      ensembleAiScore: 0.5,
      agreement: 0.4,
      windows: [win(0.22, 0), win(0.78, 1), win(0.25, 2)],
      artifacts: emptyArtifacts,
      openFlags: 3,
    });
    assert.equal(ev.level, "hybrid");
    assert.ok(ev.hotWindows >= 1);
    assert.ok(ev.styleShift >= 0.22);
  });
});

describe("phrase flags still discriminate", () => {
  it("AI sample dense, human sample quiet", () => {
    const ai = SAMPLE_PAPERS.find((p) => p.id === "ai-related");
    const human = SAMPLE_PAPERS.find((p) => p.id === "human-systems");
    assert.ok(ai && human);
    const a = buildSuggestions(ai.text);
    const h = buildSuggestions(human.text);
    assert.ok(a.length >= 5);
    assert.ok(h.length <= 2);
  });
});


describe("vocab replacements", () => {
  it("flags generator words on the AI sample with a replacement", () => {
    const ai = SAMPLE_PAPERS.find((p) => p.id === "ai-related");
    assert.ok(ai);
    const flags = vocabSuggestions(ai.text);
    assert.ok(flags.length >= 4, `expected vocab flags, got ${flags.length}`);
    assert.ok(flags.every((f) => f.kind === "word" && f.rewrite.length > 0));
    assert.ok(flags.some((f) => f.alternatives && f.alternatives.length >= 1));
  });

  it("replaceAll swaps every occurrence, case-preserved", () => {
    const next = replaceAllWord("Leverage this and then leverage that.", "leverage", "use");
    assert.equal(next, "Use this and then use that.");
  });

  it("stays quiet on the human systems sample", () => {
    const human = SAMPLE_PAPERS.find((p) => p.id === "human-systems");
    assert.ok(human);
    assert.ok(vocabSuggestions(human.text).length <= 1);
  });
});

describe("paragraph replacements", () => {
  it("offers a rewritten paragraph on the AI sample", () => {
    const ai = SAMPLE_PAPERS.find((p) => p.id === "ai-related");
    assert.ok(ai);
    const flags = paragraphSuggestions(ai.text);
    assert.ok(flags.length >= 1);
    assert.ok(flags[0].rewrite.length > 40);
    assert.notEqual(flags[0].rewrite, flags[0].excerpt);
  });
});
