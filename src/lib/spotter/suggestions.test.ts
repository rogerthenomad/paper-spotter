import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_PAPERS } from "./samples.ts";
import { applyFixes, applyRewriteToText, buildSuggestions } from "./suggestions.ts";
import { normalize } from "./text.ts";

describe("buildSuggestions", () => {
  it("flags the AI related-work sample densely", () => {
    const ai = SAMPLE_PAPERS.find((p) => p.id === "ai-related");
    assert.ok(ai);
    const flags = buildSuggestions(ai.text);
    assert.ok(flags.length >= 5, `expected ≥5 flags, got ${flags.length}`);
    assert.ok(flags.every((f) => f.status === "open"));
    assert.ok(flags.some((f) => f.kind === "cliche" || f.kind === "cadence"));
    assert.ok(flags.some((f) => /garnered|pivotal|delve|tapestry|furthermore/i.test(f.excerpt)));
  });

  it("stays quiet on the human systems sample", () => {
    const human = SAMPLE_PAPERS.find((p) => p.id === "human-systems");
    assert.ok(human);
    const flags = buildSuggestions(human.text);
    assert.ok(flags.length <= 2, `expected ≤2 flags, got ${flags.length}`);
  });

  it("flags the hybrid intro's machine paragraph", () => {
    const mixed = SAMPLE_PAPERS.find((p) => p.id === "mixed-intro");
    assert.ok(mixed);
    const flags = buildSuggestions(mixed.text);
    assert.ok(flags.length >= 1);
    assert.ok(flags.some((f) => /garnered|pivotal|holistic|comprehensive/i.test(f.excerpt)));
  });

  it("can apply a rewrite into the source text", () => {
    const ai = SAMPLE_PAPERS.find((p) => p.id === "ai-related");
    assert.ok(ai);
    const source = normalize(ai.text);
    const flags = buildSuggestions(source);
    const first = flags[0];
    assert.ok(first);
    const next = applyRewriteToText(source, first);
    assert.notEqual(next, source);
  });
});

describe("applyFixes", () => {
  it("strips a stacked transition and cliche", () => {
    const { next, hits, strippedTransition } = applyFixes(
      "Furthermore, prior work has leveraged cutting-edge techniques to address this gap.",
    );
    assert.equal(strippedTransition, true);
    assert.ok(hits.length >= 1);
    assert.ok(!/furthermore/i.test(next));
    assert.ok(!/cutting-edge/i.test(next));
  });
});
