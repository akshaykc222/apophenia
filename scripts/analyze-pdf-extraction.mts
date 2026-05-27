import fs from "node:fs";
import {
  BATCH_SIZE,
  detectSections,
  extractPageRange,
  getPdfPageCount,
  suggestTitleAndSummary,
} from "../src/lib/pdf/extract";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: npx tsx scripts/analyze-pdf-extraction.mts <path-to.pdf>");
  process.exit(1);
}

const MIN_TITLE = 12;

async function main() {
  const loadBuffer = () => {
    const fileBuf = fs.readFileSync(pdfPath);
    return fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength
    );
  };

  const pageCount = await getPdfPageCount(loadBuffer());
  console.log("pageCount", pageCount);

  let totalSections = 0;
  let wouldPublish = 0;
  let skipTitleShort = 0;
  let emptyTextBatches = 0;
  let lowCharBatches = 0;
  const batchStats: { start: number; end: number; sections: number; chars: number }[] =
    [];

  for (let start = 1; start <= pageCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, pageCount);
    const text = await extractPageRange(loadBuffer(), start, end);
    const chars = text.replace(/--- صفحة \d+ ---/g, "").trim().length;
    if (chars < 50) emptyTextBatches++;
    if (chars < 200) lowCharBatches++;

    const sections = detectSections(text, start, end);
    batchStats.push({ start, end, sections: sections.length, chars });
    totalSections += sections.length;

    for (const s of sections) {
      const { title } = suggestTitleAndSummary(s.rawText);
      if (title?.trim().length >= MIN_TITLE) wouldPublish++;
      else skipTitleShort++;
    }
  }

  const dupKey = new Map<string, number>();
  for (let start = 1; start <= pageCount; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, pageCount);
    const text = await extractPageRange(loadBuffer(), start, end);
    for (const s of detectSections(text, start, end)) {
      const key = `${s.pageStart}-${s.pageEnd}`;
      dupKey.set(key, (dupKey.get(key) ?? 0) + 1);
    }
  }
  const duplicateRanges = [...dupKey.entries()].filter(([, n]) => n > 1);

  console.log("batches", batchStats.length, "BATCH_SIZE", BATCH_SIZE);
  console.log("totalSections", totalSections);
  console.log("wouldPublish (title>=12, no DB dedupe)", wouldPublish);
  console.log("skipTitleShort", skipTitleShort);
  console.log("emptyTextBatches (chars<50)", emptyTextBatches);
  console.log("lowCharBatches (chars<200)", lowCharBatches);
  console.log(
    "duplicate page ranges (would block auto-publish)",
    duplicateRanges.length,
    duplicateRanges.slice(0, 5)
  );
  console.log(
    "sections per batch: min",
    Math.min(...batchStats.map((b) => b.sections)),
    "max",
    Math.max(...batchStats.map((b) => b.sections)),
    "avg",
    (totalSections / batchStats.length).toFixed(1)
  );
  console.log(
    "sample low-text batches:",
    batchStats.filter((b) => b.chars < 200).slice(0, 8)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
