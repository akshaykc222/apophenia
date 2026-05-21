import type { SupabaseClient } from "@supabase/supabase-js";
import { extractReferenceCatalogWithLlm } from "@/lib/ai/extract-references";
import { normalizeArabicLabel } from "./extract-entities";
import { ReferenceResolver } from "./ensure-entities";

/** Pre-create categories, parties, and tender types from a PDF text sample. */
export async function bootstrapReferencesFromText(
  supabase: SupabaseClient,
  sampleText: string
): Promise<{ categories: number; ministries: number; tenderCategories: number }> {
  const resolver = new ReferenceResolver(supabase);
  await resolver.warmCaches();

  const catalog = await extractReferenceCatalogWithLlm(sampleText);

  await resolver.ensureCategory("الوزارات");
  await resolver.ensureCategory("الاستدراكات");
  await resolver.ensureCategory("الأحكام والمراسيم");
  const categories = 3;

  let ministries = 0;
  for (const name of catalog.ministries) {
    if (await resolver.ensureMinistry(name)) ministries++;
  }

  const ruleParties = extractPartiesFromTextBulk(sampleText);
  for (const name of ruleParties) {
    if (await resolver.ensureMinistry(name)) ministries++;
  }

  let tenderCategories = 0;
  for (const name of catalog.tender_categories) {
    if (await resolver.ensureTenderCategory(name)) tenderCategories++;
  }

  return { categories, ministries, tenderCategories };
}

function extractPartiesFromTextBulk(text: string): string[] {
  const patterns = [
    /(?:وزارة|وزاره)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/g,
    /(?:الجهاز|جهاز)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/g,
    /(?:مجلس|هيئة|الهيئة|الديوان|ديوان)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/g,
    /(?:مؤسسة|المؤسسة)\s+[\u0600-\u06FFa-zA-Z0-9\s\-]{2,55}/g,
  ];

  const found = new Set<string>();
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      const label = normalizeArabicLabel(m[0]);
      if (label.length >= 6) found.add(label);
    }
  }
  return [...found].slice(0, 80);
}
