import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  baseUrl,
  connectedPapersUrl,
  coreUrl,
  extractOsint,
  oaMgUrl,
  openAlexWorkUrl,
  pubmedUrl,
  queryFor,
  retractionWatchUrl,
  scholarUrl,
  semanticUrl,
  waybackUrl,
  type OsintCite,
  type OsintHit,
  type OsintStatus,
} from "@/lib/spotter/osint";
import { verifyCitations } from "@/lib/spotter/osint-verify";
import type { ScanReport } from "@/lib/spotter/types";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<OsintStatus, "human" | "mixed" | "ai" | "default"> = {
  found: "human",
  missing: "ai",
  retracted: "ai",
  unchecked: "default",
};

export function SourceDesk({ scan }: { scan: ScanReport }) {
  const cites = useMemo(() => extractOsint(scan.text), [scan.text]);
  const mut = useMutation({
    mutationFn: async (list: OsintCite[]) => verifyCitations({ data: { cites: list } }),
  });

  useEffect(() => {
    if (cites.length === 0) return;
    mut.mutate(cites);
    // verify once per chapter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.id, scan.text]);

  const hits = new Map((mut.data?.ok ? mut.data.hits : []).map((h) => [h.id, h]));
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const rank = { doi: 0, arxiv: 1, cite: 2, url: 3 } as const;
    return [...cites]
      .sort((a, b) => rank[a.kind] - rank[b.kind])
      .filter((c) => {
        const h = hits.get(c.id);
        const key = (h?.openAlexId || h?.doi || c.doi || c.arxivId || c.id).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [cites, mut.data]);
  const missing = [...hits.values()].filter((h) => h.status === "missing" || h.status === "retracted").length;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs leading-relaxed text-muted">
        Looks up DOIs and author–year cites in OpenAlex and Crossref. Scholar, CORE, BASE, and
        Wayback stay one tap away — the same academic OSINT stack a committee uses.
      </p>
      {scan.docMeta?.producer || scan.docMeta?.creator ? (
        <div className="rounded-lg bg-inset px-3 py-2 text-xs leading-relaxed">
          <div className="text-[11px] uppercase tracking-wider text-subtle">PDF metadata</div>
          <p className="mt-1 text-fg">
            {[scan.docMeta.producer, scan.docMeta.creator].filter(Boolean).join(" · ")}
            {scan.docMeta.pageCount ? ` · ${scan.docMeta.pageCount} pages` : ""}
          </p>
          {scan.docMeta.tell ? <p className="mt-1 text-machine">{scan.docMeta.tell}</p> : null}
        </div>
      ) : null}
      {mut.isPending ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Checking OpenAlex / Crossref…
        </p>
      ) : null}
      {mut.data && !mut.data.ok ? <p className="text-xs text-machine">{mut.data.error}</p> : null}
      {missing > 0 ? (
        <p className="text-xs text-machine">
          {missing} reference{missing === 1 ? "" : "s"} did not resolve. Invented DOIs fail a viva.
        </p>
      ) : null}
      {cites.length === 0 ? (
        <p className="rounded-lg bg-surface px-3 py-4 text-sm text-muted shadow-[var(--shadow-border)]">
          No DOIs, arXiv ids, or author–year cites in this excerpt. Paste the bibliography to verify
          them.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((c) => (
            <CiteRow key={c.id} cite={c} hit={hits.get(c.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CiteRow({ cite, hit }: { cite: OsintCite; hit?: OsintHit }) {
  const q = queryFor(cite);
  const status = hit?.status ?? "unchecked";
  const heading = hit?.title ?? cite.raw;
  return (
    <li className="rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-border)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[status]}>{status}</Badge>
            <span className="text-[10px] uppercase tracking-wider text-subtle">{cite.kind}</span>
          </div>
          <h3 className="mt-1 truncate text-sm font-medium">{heading}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {hit?.authors?.slice(0, 3).join(", ") || cite.authors || cite.doi || cite.arxivId}
            {hit?.year ? ` · ${hit.year}` : cite.year ? ` · ${cite.year}` : ""}
            {typeof hit?.citedBy === "number" ? ` · ${hit.citedBy.toLocaleString()} cites` : ""}
          </p>
          {hit?.note ? <p className="mt-1 text-xs text-muted">{hit.note}</p> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <OutLink href={scholarUrl(q)}>Scholar</OutLink>
        <OutLink href={semanticUrl(q)}>S2</OutLink>
        <OutLink href={coreUrl(q)}>CORE</OutLink>
        <OutLink href={baseUrl(q)}>BASE</OutLink>
        <OutLink href={openAlexWorkUrl(hit?.openAlexId, cite.doi || hit?.doi)}>OpenAlex</OutLink>
        {cite.doi || hit?.doi ? <OutLink href={oaMgUrl(cite.doi || hit?.doi || "")}>OA.mg</OutLink> : null}
        {cite.url ? <OutLink href={waybackUrl(cite.url)}>Wayback</OutLink> : null}
        {hit?.oaUrl ? <OutLink href={hit.oaUrl}>OA PDF</OutLink> : null}
        {status === "retracted" || status === "missing" ? (
          <OutLink href={retractionWatchUrl(q)}>Retraction Watch</OutLink>
        ) : null}
        <OutLink href={connectedPapersUrl(q)}>Connected</OutLink>
        <OutLink href={pubmedUrl(q)}>PubMed</OutLink>
      </div>
    </li>
  );
}

function OutLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md bg-inset px-2 text-[11px] text-muted",
        "hover:bg-raised hover:text-fg",
      )}
    >
      {children}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function SourceCount({ text }: { text: string }) {
  return extractOsint(text).length;
}
