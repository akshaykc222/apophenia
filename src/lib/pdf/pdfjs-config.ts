import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

let workerConfigured = false;

function configurePdfJsWorker(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs")
) {
  if (workerConfigured) return;

  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  workerConfigured = true;
}

export async function loadPdfJs() {
  // pdfjs-dist may reference DOMMatrix at module-load time on Vercel.
  ensureDomMatrix();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  configurePdfJsWorker(pdfjs);
  return pdfjs;
}

function ensureDomMatrix() {
  const g = globalThis as unknown as {
    DOMMatrix?: any;
    DOMMatrixReadOnly?: any;
  };

  if (g.DOMMatrix && g.DOMMatrixReadOnly) return;
  if (g.DOMMatrix) {
    // If DOMMatrix exists but DOMMatrixReadOnly doesn't, alias it.
    // eslint-disable-next-line no-param-reassign
    g.DOMMatrixReadOnly = g.DOMMatrix;
    return;
  }

  // Minimal 2D DOMMatrix polyfill for Node runtimes.
  // Used by pdfjs-dist when running in server/serverless environments.
  class DOMMatrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;

    constructor(init?: number[] | Record<string, number>) {
      if (!init) {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
        return;
      }

      if (Array.isArray(init)) {
        const values = init.length >= 6 ? init : [1, 0, 0, 1, 0, 0];
        this.a = Number(values[0]);
        this.b = Number(values[1]);
        this.c = Number(values[2]);
        this.d = Number(values[3]);
        this.e = Number(values[4]);
        this.f = Number(values[5]);
        return;
      }

      this.a = Number((init as any).a ?? 1);
      this.b = Number((init as any).b ?? 0);
      this.c = Number((init as any).c ?? 0);
      this.d = Number((init as any).d ?? 1);
      this.e = Number((init as any).e ?? 0);
      this.f = Number((init as any).f ?? 0);
    }

    get is2D() {
      return true;
    }

    get isIdentity() {
      return this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0;
    }

    toFloat64Array() {
      return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]);
    }

    multiply(other: DOMMatrix) {
      const a = this.a * other.a + this.c * other.b;
      const b = this.b * other.a + this.d * other.b;
      const c = this.a * other.c + this.c * other.d;
      const d = this.b * other.c + this.d * other.d;
      const e = this.a * other.e + this.c * other.f + this.e;
      const f = this.b * other.e + this.d * other.f + this.f;
      return new DOMMatrix([a, b, c, d, e, f]);
    }

    translate(tx: number, ty: number) {
      // Translation matrix: [1 0 0; 0 1 0; tx ty 1] in DOMMatrix form [a b c d e f]
      // For 2D: e' = e + tx*a + ty*c, f' = f + tx*b + ty*d
      this.e = this.e + tx * this.a + ty * this.c;
      this.f = this.f + tx * this.b + ty * this.d;
      return this;
    }

    scale(sx: number, sy?: number) {
      const y = sy ?? sx;
      this.a *= sx;
      this.b *= sx;
      this.c *= y;
      this.d *= y;
      return this;
    }

    inverse() {
      const det = this.a * this.d - this.b * this.c;
      if (!det) return new DOMMatrix();

      const a = this.d / det;
      const b = -this.b / det;
      const c = -this.c / det;
      const d = this.a / det;
      const e = (this.c * this.f - this.d * this.e) / det;
      const f = (this.b * this.e - this.a * this.f) / det;
      return new DOMMatrix([a, b, c, d, e, f]);
    }
  }

  g.DOMMatrix = DOMMatrix;
  g.DOMMatrixReadOnly = DOMMatrix;
}

/** Required for pdfjs-dist v5+ in Node (fixes standardFontDataUrl error). */
export function buildPdfDocumentInit(buffer: ArrayBuffer) {
  // pdfjs-dist legacy build expects DOMMatrix in serverless runtimes.
  ensureDomMatrix();

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
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("DOMMatrix is not defined")) {
      return "تعذّر على الخادم قراءة ملف PDF (DOMMatrix غير متوفر).";
    }
    if (msg.includes("standardFontDataUrl")) {
      return "تعذّر قراءة ملف PDF على الخادم (ملفات خطوط PDF غير متاحة).";
    }
    if (msg.includes("pdf.worker") || msg.includes("fake worker")) {
      return "تعذّر قراءة ملف PDF على الخادم (ملف عامل pdfjs غير متاح).";
    }
    if (msg.includes("Failed to load external module pdfjs-dist")) {
      return "تعذّر على الخادم قراءة ملف PDF بسبب خطأ في pdfjs.";
    }
    return msg;
  }
  if (typeof error === "object" && error !== null) {
    const e = error as { message?: string; details?: string };
    return e.message ?? e.details ?? JSON.stringify(error);
  }
  return String(error);
}
