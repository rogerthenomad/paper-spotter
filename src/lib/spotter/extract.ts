import { normalize, words } from "./text";

const MAX_BYTES = 8 * 1024 * 1024;
const MIN_WORDS = 40;

export type ExtractResult =
  | { ok: true; title: string; text: string }
  | { ok: false; error: string };

function titleFromName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Uploaded paper";
}

function extOf(file: File): string {
  return (file.name.split(".").pop() ?? "").toLowerCase();
}

async function extractPdf(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const n = Math.min(doc.numPages, 40);
  const pages: string[] = [];
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? String((it as { str: string }).str) : ""))
      .join(" ");
    pages.push(line);
  }
  return pages.join("\n\n");
}

async function extractDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return result.value;
}

export async function extractPaperFile(file: File): Promise<ExtractResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File is over 8 MB. Export a chapter as text or a smaller PDF." };
  }

  const ext = extOf(file);
  const title = titleFromName(file.name);
  let raw = "";

  try {
    if (ext === "pdf" || file.type === "application/pdf") {
      raw = await extractPdf(await file.arrayBuffer());
    } else if (
      ext === "docx" ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      raw = await extractDocx(await file.arrayBuffer());
    } else if (ext === "doc" || file.type === "application/msword") {
      return {
        ok: false,
        error: "Old .doc files aren’t supported. Save as .docx or PDF, or paste the text.",
      };
    } else if (
      ["txt", "md", "tex", "rst", "text"].includes(ext) ||
      file.type.startsWith("text/")
    ) {
      raw = await file.text();
    } else {
      return {
        ok: false,
        error: "Upload a PDF, Word (.docx), or text file (.txt, .md, .tex).",
      };
    }
  } catch {
    return { ok: false, error: "Could not read that file. Try a text export or paste the manuscript." };
  }

  const text = normalize(raw);
  if (words(text).length < MIN_WORDS) {
    return {
      ok: false,
      error:
        ext === "pdf"
          ? "No selectable text in this PDF. It may be a scan — paste the text or upload a .txt export."
          : "Need at least ~40 words — a paragraph of the paper, not a title page.",
    };
  }

  return { ok: true, title, text };
}
