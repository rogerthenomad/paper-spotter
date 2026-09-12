export function parseArxivId(raw: string): string | null {
  const t = raw.trim();
  const m =
    t.match(/(?:arxiv\.org\/(?:abs|pdf|html|src)\/)?(\d{4}\.\d{4,5}(?:v\d+)?)/i) ??
    t.match(/(?:arxiv\.org\/(?:abs|pdf)\/)?([a-z-]+\/\d{7}(?:v\d+)?)/i);
  return m ? m[1] : null;
}
