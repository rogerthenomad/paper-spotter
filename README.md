# Paper Spotter

Grammarly-style review for **PhD papers**. Upload a manuscript, underline machine-sounding prose, and accept a rewrite.

Signals, not proof. Formal academic English is not the same thing as generated text.

## What it does

- **Upload** a PDF, Word (`.docx`), Markdown, LaTeX, or plain-text chapter — or paste, or fetch an arXiv id
- **Underline** AI-typical sentences on the page (stock phrases, stacked transitions, hollow claims)
- **Recommend** a conservative rewrite in the margin — Accept applies it and rescores
- **Optional Grok 4.5 pass** to polish remaining flags in a human scholarly voice
- **Local ensemble** of detector proxies: stylometry, GLTR-style rank mass, Yule’s K / compressibility, DetectGPT / Fast-DetectGPT curvature, Binoculars, RADAR, Ghostbuster, plus a PhD-register scorer (citation density, named prior work, limitation specificity)

Reviews stay in the browser. Nothing is uploaded except optional Grok rewrites, the faculty verdict, and arXiv fetch.

## Web app

The dashboard lives in `src/`:

| Path | Role |
| --- | --- |
| `src/components/scan-lab.tsx` | Upload / paste / samples |
| `src/components/manuscript-view.tsx` | Paper page + wavy underlines |
| `src/components/suggestion-panel.tsx` | Score, recommendation cards, Grok rewrite |
| `src/lib/spotter/engines.ts` | Local detector ensemble |
| `src/lib/spotter/suggestions.ts` | Sentence flags + conservative phrase swaps |
| `src/lib/spotter/extract.ts` | PDF / DOCX / text extraction |
| `src/lib/spotter/rewrite.ts` | Grok rewrite (server, `grok-4.5`) |
| `src/lib/spotter/forensic.ts` | Optional faculty close-read |
| `src/lib/spotter/models.ts` | September 2026 frontier generator list |

```bash
npm install
npm run typecheck
node --experimental-strip-types --test src/lib/spotter/suggestions.test.ts
```

The live UI is a TanStack Start + React app (Tailwind v4). PDF text uses `pdfjs-dist`; Word uses `mammoth`. Grok calls need `XAI_API_KEY` on the server — never in the browser.

## Python ingest (original toolkit)

`paper_spotter/` is the original open detector skeleton: ingest a paper, type the report. GPU originals (Falcon, GPT-J, T5-3B) are cited by the web engines as proxies, not silently faked.

```bash
pip install -e .
```

## Caveat

No detector is a verdict. Short excerpts are unreliable. Accepting a rewrite does not “prove” the rest of the chapter is human. Use this as an editor, not as a judicial finding.

## License

MIT © 2026 Roger Wong Won
