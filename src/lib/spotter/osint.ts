import { parseArxivId } from "./arxiv-id.ts";

export type OsintKind = "doi" | "arxiv" | "url" | "cite";
export type OsintStatus = "found" | "missing" | "retracted" | "unchecked";

export interface OsintCite {
  id: string;
  kind: OsintKind;
  raw: string;
  doi?: string;
  arxivId?: string;
  url?: string;
  authors?: string;
  year?: string;
}

export interface OsintHit {
  id: string;
  status: OsintStatus;
  title?: string;
  year?: number;
  authors?: string[];
  orcid?: string;
  doi?: string;
  citedBy?: number;
  oaUrl?: string | null;
  openAlexId?: string;
  venue?: string;
  note?: string;
}

const DOI_RE = /\b(10\.\d{4,9}\/[A-Za-z0-9./;:_()-]+)/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"'\]\)]+/gi;
const CITE_RE =
  /\b([A-Z][A-Za-z'-]+(?:\s*,\s*[A-Z][A-Za-z'-]+)?(?:\s+(?:and|&)\s+[A-Z][A-Za-z'-]+)?(?:\s+et\s+al\.?)?)\s*\((\d{4}[a-z]?)\)/g;

function trimCite(s: string): string {
  return s.replace(/[.,;:)\]]+$/g, "").replace(/\.$/, "");
}

function normDoi(raw: string): string {
  return trimCite(raw.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, ""));
}

/** Pull DOIs, arXiv ids, URLs, and author–year cites from a chapter. */
export function extractOsint(text: string): OsintCite[] {
  const out: OsintCite[] = [];
  const seen = new Set<string>();

  function add(c: OsintCite) {
    const key = (c.doi || c.arxivId || c.url || `${c.authors}:${c.year}` || c.raw).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  }

  for (const m of text.matchAll(DOI_RE)) {
    const doi = normDoi(m[1]);
    if (doi.length < 8 || doi.length > 160) continue;
    add({ id: `doi-${out.length}`, kind: "doi", raw: doi, doi });
  }

  for (const m of text.matchAll(/\b(?:arXiv[:\s]+)?(\d{4}\.\d{4,5}(?:v\d+)?)\b/gi)) {
    const id = parseArxivId(m[1]);
    if (!id) continue;
    add({ id: `arxiv-${id}`, kind: "arxiv", raw: id, arxivId: id });
  }

  for (const m of text.matchAll(URL_RE)) {
    const url = trimCite(m[0]);
    if (/doi\.org\//i.test(url)) continue;
    if (/arxiv\.org\//i.test(url)) {
      const id = parseArxivId(url);
      if (id) add({ id: `arxiv-${id}`, kind: "arxiv", raw: id, arxivId: id, url });
      continue;
    }
    add({ id: `url-${out.length}`, kind: "url", raw: url, url });
  }

  for (const m of text.matchAll(CITE_RE)) {
    const authors = m[1].replace(/\s+/g, " ").trim();
    const year = m[2];
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December|Figure|Table|Chapter|Section)$/i.test(authors)) {
      continue;
    }
    add({
      id: `cite-${authors}-${year}`.replace(/\s+/g, "-"),
      kind: "cite",
      raw: `${authors} (${year})`,
      authors,
      year,
    });
  }

  for (const m of text.matchAll(
    /\(([A-Z][A-Za-z'-]+(?:\s+et\s+al\.?)?(?:\s+and\s+[A-Z][A-Za-z'-]+)?),\s*(\d{4}[a-z]?)\)/g,
  )) {
    add({
      id: `cite-${m[1]}-${m[2]}`.replace(/\s+/g, "-"),
      kind: "cite",
      raw: `${m[1]} (${m[2]})`,
      authors: m[1].replace(/\s+/g, " ").trim(),
      year: m[2],
    });
  }

  return out.slice(0, 24);
}

export function scholarUrl(q: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`;
}

export function coreUrl(q: string): string {
  return `https://core.ac.uk/search?q=${encodeURIComponent(q)}`;
}

export function baseUrl(q: string): string {
  return `https://www.base-search.net/Search/Results?lookfor=${encodeURIComponent(q)}`;
}

export function semanticUrl(q: string): string {
  return `https://www.semanticscholar.org/search?q=${encodeURIComponent(q)}`;
}

export function openAlexWorkUrl(openAlexId?: string, doi?: string): string {
  if (openAlexId) {
    const id = openAlexId.replace("https://openalex.org/", "");
    return `https://openalex.org/${id}`;
  }
  if (doi) return `https://openalex.org/works?filter=doi:${encodeURIComponent(doi)}`;
  return "https://openalex.org";
}

export function waybackUrl(url: string): string {
  return `https://web.archive.org/web/*/${url}`;
}

export function oaMgUrl(doi: string): string {
  return `https://oa.mg/work/${encodeURIComponent(doi)}`;
}

export function retractionWatchUrl(q: string): string {
  return `https://retractionwatch.com/?s=${encodeURIComponent(q)}`;
}

export function pubmedUrl(q: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;
}

export function connectedPapersUrl(q: string): string {
  return `https://www.connectedpapers.com/search?q=${encodeURIComponent(q)}`;
}

export function queryFor(c: OsintCite): string {
  if (c.doi) return c.doi;
  if (c.arxivId) return `arXiv ${c.arxivId}`;
  if (c.authors && c.year) return `${c.authors} ${c.year}`;
  return c.raw;
}

export function producerTell(meta: {
  producer?: string;
  creator?: string;
}): string | undefined {
  const blob = `${meta.producer ?? ""} ${meta.creator ?? ""}`.toLowerCase();
  if (/chatgpt|openai|claude|anthropic|gemini|copilot|grok/.test(blob)) {
    return "PDF producer looks like an AI-chat export — unusual for a submitted dissertation.";
  }
  if (/wkhtml|weasyprint|reportlab|puppeteer|playwright/.test(blob)) {
    return "PDF was printed from an HTML pipeline, not a thesis class or Word.";
  }
  return undefined;
}
