import { buildPdfDocumentInit, loadPdfJs, formatPdfError } from "./pdfjs-config";

const BATCH_SIZE = 15;

export { BATCH_SIZE };

export async function getPdfPageCount(buffer: ArrayBuffer): Promise<number> {
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument(buildPdfDocumentInit(buffer)).promise;
    return doc.numPages;
  } catch (error) {
    throw new Error(`فشل قراءة PDF: ${formatPdfError(error)}`);
  }
}

export async function extractPageRange(
  buffer: ArrayBuffer,
  pageStart: number,
  pageEnd: number
): Promise<string> {
  try {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument(buildPdfDocumentInit(buffer)).promise;
    const parts: string[] = [];

    for (let p = pageStart; p <= Math.min(pageEnd, doc.numPages); p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      parts.push(`--- صفحة ${p} ---\n${text}`);
    }

    return parts.join("\n\n");
  } catch (error) {
    throw new Error(`فشل استخراج الصفحات ${pageStart}-${pageEnd}: ${formatPdfError(error)}`);
  }
}

export interface DetectedSection {
  pageStart: number;
  pageEnd: number;
  rawText: string;
  suggestedType: "article" | "tender" | "decree" | "addendum";
  confidence: number;
}

const TENDER_KEYWORDS = ["مناقصة", "مزاد", "عطاء", "تأهيل"];
const DECREE_KEYWORDS = ["مرسوم", "قرار", "أمر أميري", "قانون رقم"];
const ADDENDUM_KEYWORDS = ["استدراك", "تصحيح", "إلغاء البند"];

export function detectSections(
  fullText: string,
  pageStart: number,
  pageEnd: number
): DetectedSection[] {
  const lines = fullText.split(/\n+/).filter((l) => l.trim().length > 10);
  if (lines.length === 0) {
    return [
      {
        pageStart,
        pageEnd,
        rawText: fullText.slice(0, 8000),
        suggestedType: "article",
        confidence: 0.3,
      },
    ];
  }

  const sections: DetectedSection[] = [];
  let chunk: string[] = [];

  const flush = (endLine: number) => {
    if (chunk.length === 0) return;
    const text = chunk.join("\n");
    let suggestedType: DetectedSection["suggestedType"] = "article";
    let confidence = 0.5;

    if (TENDER_KEYWORDS.some((k) => text.includes(k))) {
      suggestedType = "tender";
      confidence = 0.7;
    } else if (DECREE_KEYWORDS.some((k) => text.includes(k))) {
      suggestedType = "decree";
      confidence = 0.75;
    } else if (ADDENDUM_KEYWORDS.some((k) => text.includes(k))) {
      suggestedType = "addendum";
      confidence = 0.65;
    } else if (text.includes("وزارة") || text.includes("مجلس")) {
      suggestedType = "article";
      confidence = 0.6;
    }

    sections.push({
      pageStart,
      pageEnd,
      rawText: text,
      suggestedType,
      confidence,
    });
    void endLine;
    chunk = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader =
      /^وزارة/.test(line) ||
      /^الجهاز/.test(line) ||
      /^م(?:ناقصة|زاد)/.test(line) ||
      /^قرار\s/.test(line) ||
      /^مرسوم\s/.test(line);

    if (isHeader && chunk.length > 3) {
      flush(i);
    }
    chunk.push(line);
    if (chunk.join("").length > 2500) {
      flush(i);
    }
  }
  flush(lines.length);

  if (sections.length === 0) {
    sections.push({
      pageStart,
      pageEnd,
      rawText: fullText.slice(0, 8000),
      suggestedType: "article",
      confidence: 0.4,
    });
  }

  return dedupeSections(sections);
}

function dedupeSections(sections: DetectedSection[]): DetectedSection[] {
  const result: DetectedSection[] = [];
  for (const s of sections) {
    const overlap = result.find(
      (r) =>
        overlapRatio(r.rawText, s.rawText) > 0.8 &&
        r.pageStart === s.pageStart &&
        r.pageEnd === s.pageEnd
    );
    if (!overlap) result.push(s);
  }
  return result;
}

function overlapRatio(a: string, b: string): number {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length >= b.length ? a : b;
  if (shorter.length === 0) return 0;
  return shorter.length / longer.length > 0.9 ? 1 : 0;
}

export function suggestTitleAndSummary(rawText: string): {
  title: string;
  summary: string;
  body: string;
} {
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const title =
    lines.find((l) => l.length >= 15 && l.length <= 180) ?? lines[0] ?? "بدون عنوان";
  const summary = lines.slice(1, 4).join(" ").slice(0, 300) || title;
  const body = lines.join("\n\n").slice(0, 12000);

  return { title, summary, body };
}
