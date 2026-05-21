import type { SupabaseClient } from "@supabase/supabase-js";
import type { SuggestionResult } from "@/lib/ai/suggest";
import { normalizeContentType } from "@/lib/content/normalize-content-type";
import type { ContentType } from "@/lib/types/database";
import {
  extractCategoryNameAr,
  extractIssuingPartyNameAr,
  extractTenderCategoryNameAr,
} from "./extract-entities";
import { ReferenceResolver } from "./ensure-entities";

export async function resolveForExtraction(
  resolver: ReferenceResolver,
  rawText: string,
  suggestion: SuggestionResult
) {
  const contentType = normalizeContentType(suggestion.content_type, "article");

  const categoryName = extractCategoryNameAr(
    rawText,
    contentType
  );
  const categoryId = await resolver.ensureCategory(
    suggestion.category_guess ?? categoryName
  );

  const partyName =
    suggestion.ministry_guess ?? extractIssuingPartyNameAr(rawText);
  const ministry = partyName ? await resolver.ensureMinistry(partyName) : null;

  let tenderCategoryId: string | null = null;
  if (contentType === "tender") {
    const tenderName =
      suggestion.tender_category_guess ?? extractTenderCategoryNameAr(rawText);
    if (tenderName) {
      tenderCategoryId = await resolver.ensureTenderCategory(tenderName);
    }
  }

  return {
    categoryId,
    categoryName,
    ministryId: ministry?.id ?? null,
    ministryName: ministry?.name_ar ?? null,
    tenderCategoryId,
  };
}

export async function createResolver(supabase: SupabaseClient) {
  const resolver = new ReferenceResolver(supabase);
  await resolver.warmCaches();
  return resolver;
}
