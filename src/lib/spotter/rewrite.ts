import { createServerFn } from "@tanstack/react-start";

export type RewriteInput = { id: string; excerpt: string; issue: string };

function parseRewrites(raw: string): { id: string; rewrite: string }[] {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return [];
  try {
    const j = JSON.parse(raw.slice(start, end + 1)) as {
      rewrites?: { id?: unknown; rewrite?: unknown }[];
    };
    if (!Array.isArray(j.rewrites)) return [];
    return j.rewrites
      .slice(0, 8)
      .map((r) => ({
        id: String(r.id ?? ""),
        rewrite: String(r.rewrite ?? "").trim(),
      }))
      .filter((r) => r.id && r.rewrite.length > 0);
  } catch {
    return [];
  }
}

export const rewritePassages = createServerFn({ method: "POST" })
  .validator((input: { passages: RewriteInput[] }) => input)
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; rewrites: { id: string; rewrite: string }[] } | { ok: false; error: string }
    > => {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return { ok: false, error: "Rewrites are unavailable in this environment." };
      }

      const passages = data.passages.slice(0, 8).map((p) => ({
        id: p.id,
        issue: p.issue.slice(0, 240),
        excerpt: p.excerpt.slice(0, 500),
      }));
      if (passages.length === 0) {
        return { ok: false, error: "No passages left to rewrite." };
      }

      const prompt = `You are an editor for PhD-level academic English. Rewrite each flagged sentence so it sounds like a careful human scholar — specific, slightly uneven, not template-polished.

Rules:
- Keep the author's meaning. Do not invent numbers, papers, datasets, venues, or results.
- Strip AI cliches (delve, tapestry, landscape, pivotal role, garnered attention, paves the way, multifaceted, holistic, in recent years, it is important to note, comprehensive overview).
- If the sentence is empty of content, return a short tight version and add [add specific evidence] where a fact should go.
- Do not add stacked transitions (Furthermore / Moreover / Additionally).
- Return ONLY JSON.

Passages:
${JSON.stringify(passages, null, 2)}

Format:
{"rewrites":[{"id":"...","rewrite":"..."}]}`;

      try {
        const res = await fetch("https://api.x.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "grok-4.5",
            temperature: 0.3,
            max_tokens: 1400,
            messages: [
              {
                role: "system",
                content:
                  "You edit academic prose. Never invent evidence. JSON only.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!res.ok) return { ok: false, error: `Rewrite model error ${res.status}` };
        const body = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = body.choices?.[0]?.message?.content ?? "";
        const rewrites = parseRewrites(text);
        if (rewrites.length === 0) {
          return { ok: false, error: "Could not parse rewrite suggestions." };
        }
        return { ok: true, rewrites };
      } catch {
        return { ok: false, error: "Rewrite pass failed." };
      }
    },
  );
