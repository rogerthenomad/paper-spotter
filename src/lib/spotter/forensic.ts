import { createServerFn } from "@tanstack/react-start";
import { FRONTIER_MODELS } from "./models";
import type { ForensicReport, GeneratorGuess, Label } from "./types";

const MODEL_LIST = FRONTIER_MODELS.map((m) => `${m.name} (${m.lab}, ${m.released})`).join("; ");

function asLabel(s: unknown): Label {
  return s === "human" || s === "mixed" || s === "ai" ? s : "mixed";
}

function parseReport(raw: string): ForensicReport | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const gens = Array.isArray(j.likely_generators)
      ? (j.likely_generators as Record<string, unknown>[]).slice(0, 4).map(
          (g): GeneratorGuess => ({
            model: String(g.model ?? "unknown"),
            lab: String(g.lab ?? ""),
            confidence: Number(g.confidence ?? 0),
            rationale: String(g.rationale ?? ""),
          }),
        )
      : [];
    const flags = Array.isArray(j.flags)
      ? (j.flags as Record<string, unknown>[]).slice(0, 8).map((f) => ({
          code: String(f.code ?? "flag"),
          severity: (f.severity === "high" || f.severity === "low" ? f.severity : "med") as
            | "low"
            | "med"
            | "high",
          detail: String(f.detail ?? ""),
        }))
      : [];
    const caveats = Array.isArray(j.caveats) ? (j.caveats as unknown[]).map(String).slice(0, 5) : [];
    const aiScore = Math.min(1, Math.max(0, Number(j.ai_score ?? 0.5)));
    return {
      aiScore,
      label: asLabel(j.label),
      verdict: String(j.verdict ?? "").slice(0, 1200),
      likelyGenerators: gens,
      flags,
      caveats,
    };
  } catch {
    return null;
  }
}

export const runForensicPass = createServerFn({ method: "POST" })
  .validator((input: { title: string; excerpt: string; stats: string }) => input)
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; report: ForensicReport } | { ok: false; error: string }> => {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return { ok: false, error: "Committee read is unavailable in this environment." };
      }

      const excerpt = data.excerpt.slice(0, 7000);
      const prompt = `You are a faculty examiner doing a forensic close-read of PhD-level academic prose. Decide if the writing is human, mixed (human structure + model polish, or vice versa), or predominantly machine-generated. Attribute style against these September 2026 systems when you can: ${MODEL_LIST}.

Be conservative. Dissertation English is formal; formality alone is not AI. Look for: stacked transitions, hollow contributions, generic related work, missing specific numbers/venues, cliches (delve, tapestry, landscape, pivotal role, garnered attention, paves the way), uniform sentence length, and polished-but-empty claims. Human signals: abandoned attempts, named prior fights, ugly logs, specific hardware, admitted holes in proofs, bursty rhythm.

Title: ${data.title}
Local detector stats (0=human, 1=AI): ${data.stats}

Manuscript excerpt:
"""
${excerpt}
"""

Return ONLY JSON:
{
  "ai_score": 0-1 number,
  "label": "human" | "mixed" | "ai",
  "verdict": "2-4 sentence faculty-style assessment",
  "likely_generators": [{"model":"","lab":"","confidence":0-1,"rationale":""}],
  "flags": [{"code":"short_snake","severity":"low|med|high","detail":""}],
  "caveats": ["..."]
}`;

      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            temperature: 0.2,
            max_tokens: 1100,
            messages: [
              {
                role: "system",
                content:
                  "You are a cautious academic integrity examiner. Never claim certainty. JSON only.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!res.ok) return { ok: false, error: `Forensic model error ${res.status}` };
        const body = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = body.choices?.[0]?.message?.content ?? "";
        const report = parseReport(text);
        if (!report) return { ok: false, error: "Could not parse the committee read." };
        return { ok: true, report };
      } catch {
        return { ok: false, error: "Committee read failed." };
      }
    },
  );
