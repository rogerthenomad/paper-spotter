import { createServerFn } from "@tanstack/react-start";
import type { OsintCite, OsintHit } from "./osint";

const UA = "PaperSpotter/1.0 (dissertation citation desk; mailto:research@paperspotter.local)";

type OpenAlexWork = {
  id?: string;
  doi?: string | null;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  is_retracted?: boolean;
  authorships?: Array<{
    author?: { display_name?: string; orcid?: string | null };
  }>;
  primary_location?: { source?: { display_name?: string | null } | null } | null;
  open_access?: { is_oa?: boolean; oa_url?: string | null };
};

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function fromWork(id: string, work: OpenAlexWork | null): OsintHit | null {
  if (!work?.display_name) return null;
  const authors = (work.authorships ?? [])
    .map((a) => a.author?.display_name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 4);
  const orcid = work.authorships?.find((a) => a.author?.orcid)?.author?.orcid ?? undefined;
  const retracted = Boolean(work.is_retracted);
  return {
    id,
    status: retracted ? "retracted" : "found",
    title: work.display_name,
    year: work.publication_year,
    authors,
    orcid: orcid ?? undefined,
    doi: work.doi ? work.doi.replace(/^https?:\/\/doi\.org\//i, "") : undefined,
    citedBy: work.cited_by_count,
    oaUrl: work.open_access?.oa_url ?? null,
    openAlexId: work.id,
    venue: work.primary_location?.source?.display_name ?? undefined,
    note: retracted
      ? "Marked retracted in OpenAlex. Check Retraction Watch before citing."
      : work.open_access?.is_oa
        ? "Open-access copy available."
        : undefined,
  };
}

async function lookupDoi(id: string, doi: string): Promise<OsintHit> {
  const oa = (await getJson(
    `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}`,
  )) as OpenAlexWork | null;
  const hit = fromWork(id, oa);
  if (hit) return hit;

  const xref = (await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)) as {
    message?: { title?: string[]; author?: Array<{ family?: string; given?: string }>; issued?: { "date-parts"?: number[][] }; "is-referenced-by-count"?: number; "container-title"?: string[] };
  } | null;
  const msg = xref?.message;
  if (msg?.title?.[0]) {
    return {
      id,
      status: "found",
      title: msg.title[0],
      year: msg.issued?.["date-parts"]?.[0]?.[0],
      authors: (msg.author ?? []).slice(0, 4).map((a) => [a.given, a.family].filter(Boolean).join(" ")),
      doi,
      citedBy: msg["is-referenced-by-count"],
      venue: msg["container-title"]?.[0],
      note: "Resolved via Crossref.",
    };
  }
  return {
    id,
    status: "missing",
    doi,
    note: "DOI did not resolve in OpenAlex or Crossref — a common hallucinated-reference tell.",
  };
}

async function lookupSearch(cite: OsintCite): Promise<OsintHit> {
  const q = cite.arxivId
    ? `arXiv:${cite.arxivId}`
    : cite.authors && cite.year
      ? `${cite.authors} ${cite.year}`
      : cite.raw;
  const data = (await getJson(
    `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=3`,
  )) as { results?: OpenAlexWork[] } | null;
  const year = cite.year ? Number.parseInt(cite.year, 10) : undefined;
  const match =
    data?.results?.find((w) => (year ? w.publication_year === year : true)) ?? data?.results?.[0];
  const hit = fromWork(cite.id, match ?? null);
  if (hit) {
    if (year && hit.year && Math.abs(hit.year - year) > 1) {
      return {
        ...hit,
        status: "found",
        note: `Closest OpenAlex match is ${hit.year}, not ${year}. Confirm the bibliography.`,
      };
    }
    return hit;
  }
  return {
    id: cite.id,
    status: cite.kind === "url" ? "unchecked" : "missing",
    note:
      cite.kind === "url"
        ? "Live URL not fetched. Use Wayback if the source has moved."
        : "No OpenAlex match. Could be grey literature — or an invented cite.",
  };
}

export const verifyCitations = createServerFn({ method: "POST" })
  .validator((input: { cites: OsintCite[] }) => input)
  .handler(async ({ data }): Promise<{ ok: true; hits: OsintHit[] } | { ok: false; error: string }> => {
    const cites = data.cites.slice(0, 12);
    if (cites.length === 0) return { ok: true, hits: [] };
    try {
      const hits = await Promise.all(
        cites.map((c) => (c.doi ? lookupDoi(c.id, c.doi) : lookupSearch(c))),
      );
      return { ok: true, hits };
    } catch {
      return { ok: false, error: "Citation lookup failed. Scholar / CORE / BASE links still work." };
    }
  });
