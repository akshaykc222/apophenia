import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CANONICAL_CATEGORIES,
  canonicalizeCategoryName,
  getCanonicalMeta,
} from "./canonical-categories";

const CANONICAL_SLUGS = CANONICAL_CATEGORIES.map((c) => c.slug);

/**
 * On each PDF bootstrap: repoint content off duplicate categories, delete extras,
 * keep only the three canonical tabs (same effect as migration 005).
 */
export async function pruneNonCanonicalCategories(
  supabase: SupabaseClient
): Promise<{ deleted: number; repointed: number }> {
  const { data: canonicalRows } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", [...CANONICAL_SLUGS]);

  const slugToId = new Map(
    (canonicalRows ?? []).map((r) => [r.slug, r.id] as const)
  );

  for (const meta of CANONICAL_CATEGORIES) {
    if (!slugToId.has(meta.slug)) {
      const { data: upserted } = await supabase
        .from("categories")
        .upsert(
          {
            name_ar: meta.name_ar,
            name_en: meta.name_en,
            slug: meta.slug,
            sort_order: meta.sort_order,
            is_trending: meta.is_trending,
            source: "canonical",
          },
          { onConflict: "slug" }
        )
        .select("id, slug")
        .single();
      if (upserted) slugToId.set(upserted.slug, upserted.id);
    }
  }

  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name_ar, name_en, slug");

  const extras = (allCategories ?? []).filter(
    (c) => !CANONICAL_SLUGS.includes(c.slug)
  );

  let deleted = 0;
  let repointed = 0;

  for (const dup of extras) {
    const label = dup.name_ar || dup.name_en || "";
    const meta = getCanonicalMeta(canonicalizeCategoryName(label));
    const targetId = slugToId.get(meta.slug);
    if (!targetId) continue;

    await supabase
      .from("content_items")
      .update({ category_id: targetId })
      .eq("category_id", dup.id);

    await supabase
      .from("content_drafts")
      .update({ category_id: targetId })
      .eq("category_id", dup.id);

    repointed++;

    const { error } = await supabase.from("categories").delete().eq("id", dup.id);
    if (!error) deleted++;
  }

  return { deleted, repointed };
}
