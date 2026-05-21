import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSearchText, slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { normalizeContentType } from "@/lib/content/normalize-content-type";
import type { ContentDraft } from "@/lib/types/database";

export async function publishDraft(
  supabase: SupabaseClient,
  draft: ContentDraft,
  actorId: string,
  ministryName?: string | null
) {
  const title = draft.title_ar?.trim();
  if (!title) throw new Error("العنوان مطلوب للنشر");

  const searchText = buildSearchText([
    title,
    draft.summary_ar,
    draft.body_ar,
    ministryName,
    ...(draft.tags ?? []),
  ]);

  const slug = `${slugify(title)}-${Date.now().toString(36)}`;

  const { data: item, error } = await supabase
    .from("content_items")
    .insert({
      issue_id: draft.issue_id,
      draft_id: draft.id,
      content_type: normalizeContentType(draft.content_type, "article"),
      category_id: draft.category_id,
      ministry_id: draft.ministry_id,
      tender_category_id: draft.tender_category_id,
      title_ar: title,
      summary_ar: draft.summary_ar,
      body_ar: draft.body_ar,
      slug,
      search_text: searchText,
      tags: draft.tags ?? [],
      source_name: draft.source_name ?? "كويت اليوم",
      source_logo_url: draft.source_logo_url,
      is_featured: draft.is_featured,
      is_published: true,
      published_at: new Date().toISOString(),
      deadline_at: draft.deadline_at,
      application_url: draft.application_url,
      page_start: draft.page_start,
      page_end: draft.page_end,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("content_drafts")
    .update({ status: "accepted", reviewed_by: actorId, reviewed_at: new Date().toISOString() })
    .eq("id", draft.id);

  await logAudit(supabase, {
    actorId,
    action: "publish",
    entityType: "content_item",
    entityId: item.id,
    payload: { draft_id: draft.id, title },
  });

  return item;
}
