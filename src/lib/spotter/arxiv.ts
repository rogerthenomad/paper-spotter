import { createServerFn } from "@tanstack/react-start";
import { parseArxivId } from "./arxiv-id";
import type { ArxivPaper } from "./types";

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlField(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : "";
}

function xmlFields(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(decodeXml(m[1]));
  return out;
}

export const fetchArxivPaper = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(
    async ({ data }): Promise<{ ok: true; paper: ArxivPaper } | { ok: false; error: string }> => {
      const id = parseArxivId(data.id);
      if (!id) return { ok: false, error: "Not an arXiv id. Try 1706.03762 or a full abs URL." };

      const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
      let xml: string;
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "PaperSpotter/0.1 (dissertation forensics; research use)" },
        });
        if (!res.ok) return { ok: false, error: `arXiv returned ${res.status}` };
        xml = await res.text();
      } catch {
        return { ok: false, error: "Could not reach arXiv." };
      }

      const entry = xml.split("<entry>")[1];
      if (!entry) return { ok: false, error: `No paper found for ${id}.` };

      const atomId = xmlField(entry, "id");
      const pdfMatch = entry.match(/href="([^"]+\.pdf)"/i);
      const paper: ArxivPaper = {
        id,
        title: xmlField(entry, "title"),
        authors: xmlFields(entry, "name"),
        summary: xmlField(entry, "summary"),
        published: xmlField(entry, "published"),
        categories: (entry.match(/term="([^"]+)"/g) ?? []).map((t) => t.slice(6, -1)),
        pdfUrl: pdfMatch?.[1] ?? `https://arxiv.org/pdf/${id}`,
        absUrl: atomId || `https://arxiv.org/abs/${id}`,
      };

      try {
        const txtRes = await fetch(`https://arxiv-txt.org/abs/${id}`, {
          headers: { "User-Agent": "PaperSpotter/0.1" },
        });
        if (txtRes.ok) {
          const full = (await txtRes.text()).trim();
          if (full.length > 400) paper.fullText = full.slice(0, 90000);
        }
      } catch {
        // Abstract-only is still a valid scan.
      }

      return { ok: true, paper };
    },
  );
