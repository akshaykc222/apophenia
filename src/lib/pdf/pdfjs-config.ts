import path from "node:path";
import { pathToFileURL } from "node:url";

export async function loadPdfJs() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

/** Required for pdfjs-dist v5+ in Node (fixes standardFontDataUrl error). */
export function buildPdfDocumentInit(buffer: ArrayBuffer) {
  const standardFontDataUrl = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/standard_fonts/")
  ).toString();

  return {
    data: new Uint8Array(buffer),
    standardFontDataUrl,
    useSystemFonts: true,
    verbosity: 0 as const,
  };
}

export function formatPdfError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; details?: string };
    return e.message ?? e.details ?? JSON.stringify(error);
  }
  return String(error);
}
