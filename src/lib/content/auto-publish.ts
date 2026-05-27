import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSearchText, slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { normalizeContentType } from "@/lib/content/normalize-content-type";
import type { ContentType } from "@/lib/types/database";
import type { SuggestionResult } from "@/lib/ai/suggest";

const MIN_TITLE_LENGTH = 12;

export function isAutoPublishEnabled() {
  return process.env.AUTO_PUBLISH !== "false";
}

export async function autoPublishExtractedItem(
  supabase: SupabaseClient,
  params: {
    issueId: string;
    issueDate: string;
    suggestion: SuggestionResult;
    categoryId: string | null;
    ministryId: string | null;
    ministryName?: string | null;
    tenderCategoryId?: string | null;
    pageStart: number;
    pageEnd: number;
    actorId?: string | null;
  }
): Promise<{ published: boolean; skipped?: string; itemId?: string }> {
  const title = params.suggestion.title_ar?.trim();
  if (!title || title.length < MIN_TITLE_LENGTH) {
    return { published: false, skipped: "title_too_short" };
  }

  const { data: existing } = await supabase
    .from("content_items")
    .select("id")
    .eq("issue_id", params.issueId)
    .eq("page_start", params.pageStart)
    .eq("page_end", params.pageEnd)
    .eq("title_ar", title)
    .maybeSingle();

  if (existing) {
    return { published: false, skipped: "duplicate_page_range" };
  }

  const searchText = buildSearchText([
    title,
    params.suggestion.summary_ar,
    params.suggestion.body_ar,
    params.ministryName,
  ]);

  const slug = `${slugify(title)}-p${params.pageStart}-${Date.now().toString(36)}`;
  const publishedAt = new Date(params.issueDate).toISOString();

  const { data: item, error } = await supabase
    .from("content_items")
    .insert({
      issue_id: params.issueId,
      content_type: normalizeContentType(params.suggestion.content_type, "article"),
      category_id: params.categoryId,
      ministry_id: params.ministryId,
      tender_category_id: params.tenderCategoryId ?? null,
      title_ar: title,
      summary_ar: params.suggestion.summary_ar,
      body_ar: params.suggestion.body_ar,
      slug,
      search_text: searchText,
      source_name: "كويت اليوم",
      is_featured: false,
      is_published: true,
      published_at: publishedAt,
      page_start: params.pageStart,
      page_end: params.pageEnd,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { published: false, skipped: "duplicate_slug" };
    }
    throw error;
  }

  if (params.actorId) {
    await logAudit(supabase, {
      actorId: params.actorId,
      action: "auto_publish",
      entityType: "content_item",
      entityId: item.id,
      payload: {
        issue_id: params.issueId,
        page_start: params.pageStart,
        page_end: params.pageEnd,
        title,
      },
    });
  }

  return { published: true, itemId: item.id };
}
