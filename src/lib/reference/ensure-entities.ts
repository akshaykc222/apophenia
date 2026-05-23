import type { SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "@/lib/utils";
import { normalizeArabicLabel } from "./extract-entities";
import {
  CANONICAL_CATEGORIES,
  canonicalizeCategoryName,
  getCanonicalMeta,
} from "./canonical-categories";

async function uniqueSlug(
  supabase: SupabaseClient,
  table: "categories" | "ministries" | "tender_categories",
  base: string
): Promise<string> {
  let slug = slugify(base) || `item-${Date.now().toString(36)}`;
  let attempt = 0;

  while (attempt < 5) {
    const { data } = await supabase.from(table).select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${slug}-${++attempt}`;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Creates categories, ministries (parties), and tender categories
 * discovered in PDF text when they do not already exist.
 */
export class ReferenceResolver {
  private categoryCache = new Map<string, string>();
  private ministryCache = new Map<string, string>();
  private tenderCategoryCache = new Map<string, string>();

  constructor(private supabase: SupabaseClient) {}

  private async touchLastSeen(
    table: "ministries" | "tender_categories",
    id: string
  ) {
    await this.supabase
      .from(table)
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", id);
  }

  private cacheKey(name: string) {
    return normalizeArabicLabel(name).toLowerCase();
  }

  async ensureCategory(nameInput: string): Promise<string | null> {
    if (!nameInput?.trim()) return null;

    const meta = getCanonicalMeta(nameInput);
    const key = this.cacheKey(meta.name_ar);
    if (this.categoryCache.has(key)) return this.categoryCache.get(key)!;

    const existing = await this.findCategoryBySlug(meta.slug);
    if (existing) {
      this.categoryCache.set(key, existing);
      return existing;
    }

    const { data: created, error } = await this.supabase
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
      .select("id")
      .single();

    if (error) {
      console.error("ensureCategory failed:", error.message);
      return null;
    }

    this.categoryCache.set(key, created.id);
    return created.id;
  }

  private async findCategoryBySlug(slug: string): Promise<string | null> {
    const { data } = await this.supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return data?.id ?? null;
  }

  async ensureMinistry(nameAr: string): Promise<{ id: string; name_ar: string } | null> {
    const label = normalizeArabicLabel(nameAr);
    if (!label || label.length < 4) return null;

    const key = this.cacheKey(label);
    if (this.ministryCache.has(key)) {
      const id = this.ministryCache.get(key)!;
      await this.touchLastSeen("ministries", id);
      return { id, name_ar: label };
    }

    const { data: existing } = await this.supabase
      .from("ministries")
      .select("id, name_ar")
      .ilike("name_ar", label)
      .maybeSingle();

    const baseSlug = slugify(label);
    const { data: bySlug } = await this.supabase
      .from("ministries")
      .select("id, name_ar")
      .eq("slug", baseSlug)
      .maybeSingle();

    if (bySlug) {
      await this.touchLastSeen("ministries", bySlug.id);
      this.ministryCache.set(key, bySlug.id);
      return { id: bySlug.id, name_ar: bySlug.name_ar };
    }

    if (existing) {
      await this.touchLastSeen("ministries", existing.id);
      this.ministryCache.set(key, existing.id);
      return { id: existing.id, name_ar: existing.name_ar };
    }

    const partial = await this.findMinistryByPartial(label);
    if (partial) {
      await this.touchLastSeen("ministries", partial.id);
      this.ministryCache.set(key, partial.id);
      return partial;
    }

    const slug = await uniqueSlug(this.supabase, "ministries", label);
    const { data: created, error } = await this.supabase
      .from("ministries")
      .insert({
        name_ar: label,
        name_en: null,
        slug,
        logo_url: null,
        source: "pdf",
        last_seen_at: new Date().toISOString(),
      })
      .select("id, name_ar")
      .single();

    if (error) {
      console.error("ensureMinistry failed:", error.message);
      return null;
    }

    this.ministryCache.set(key, created.id);
    return { id: created.id, name_ar: created.name_ar };
  }

  private async findMinistryByPartial(label: string) {
    const { data: rows } = await this.supabase.from("ministries").select("id, name_ar");
    if (!rows?.length) return null;

    const match = rows.find(
      (r) => r.name_ar.includes(label) || label.includes(r.name_ar)
    );
    return match ? { id: match.id, name_ar: match.name_ar } : null;
  }

  async ensureTenderCategory(nameAr: string): Promise<string | null> {
    const label = normalizeArabicLabel(nameAr);
    if (!label) return null;

    const key = this.cacheKey(label);
    if (this.tenderCategoryCache.has(key)) {
      const id = this.tenderCategoryCache.get(key)!;
      await this.touchLastSeen("tender_categories", id);
      return id;
    }

    const { data: existing } = await this.supabase
      .from("tender_categories")
      .select("id")
      .ilike("name_ar", label)
      .maybeSingle();

    const baseSlug = slugify(label);
    const { data: bySlug } = await this.supabase
      .from("tender_categories")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();

    if (bySlug) {
      await this.touchLastSeen("tender_categories", bySlug.id);
      this.tenderCategoryCache.set(key, bySlug.id);
      return bySlug.id;
    }

    if (existing) {
      await this.touchLastSeen("tender_categories", existing.id);
      this.tenderCategoryCache.set(key, existing.id);
      return existing.id;
    }

    const { count } = await this.supabase
      .from("tender_categories")
      .select("*", { count: "exact", head: true });

    const slug = await uniqueSlug(this.supabase, "tender_categories", label);
    const { data: created, error } = await this.supabase
      .from("tender_categories")
      .insert({
        name_ar: label,
        name_en: null,
        slug,
        sort_order: (count ?? 0) + 1,
        source: "pdf",
        last_seen_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("ensureTenderCategory failed:", error.message);
      return null;
    }

    this.tenderCategoryCache.set(key, created.id);
    return created.id;
  }

  /** Remove ministries/tender types not seen in recent PDF bootstraps. */
  async pruneStaleReferenceRows(
    table: "ministries" | "tender_categories",
    staleBeforeIso: string
  ): Promise<number> {
    const [{ data: neverSeen }, { data: outdated }] = await Promise.all([
      this.supabase.from(table).select("id").is("last_seen_at", null),
      this.supabase
        .from(table)
        .select("id")
        .lt("last_seen_at", staleBeforeIso),
    ]);

    const staleIds = new Set([
      ...(neverSeen ?? []).map((r) => r.id),
      ...(outdated ?? []).map((r) => r.id),
    ]);

    let removed = 0;
    for (const row of [...staleIds].map((id) => ({ id }))) {
      const fkColumn =
        table === "ministries" ? "ministry_id" : "tender_category_id";
      await this.supabase
        .from("content_items")
        .update({ [fkColumn]: null })
        .eq(fkColumn, row.id);
      await this.supabase
        .from("content_drafts")
        .update({ [fkColumn]: null })
        .eq(fkColumn, row.id);
      const { error } = await this.supabase.from(table).delete().eq("id", row.id);
      if (!error) removed++;
    }
    return removed;
  }

  /** Warm caches from existing DB rows (reduces lookups during extraction). */
  async warmCaches() {
    const [{ data: cats }, { data: mins }, { data: tenders }] = await Promise.all([
      this.supabase.from("categories").select("id, name_ar"),
      this.supabase.from("ministries").select("id, name_ar"),
      this.supabase.from("tender_categories").select("id, name_ar"),
    ]);

    cats?.forEach((c) => {
      const canonical = canonicalizeCategoryName(c.name_ar);
      this.categoryCache.set(this.cacheKey(canonical), c.id);
    });
    for (const c of CANONICAL_CATEGORIES) {
      const id = await this.findCategoryBySlug(c.slug);
      if (id) this.categoryCache.set(this.cacheKey(c.name_ar), id);
    }
    mins?.forEach((m) => this.ministryCache.set(this.cacheKey(m.name_ar), m.id));
    tenders?.forEach((t) =>
      this.tenderCategoryCache.set(this.cacheKey(t.name_ar), t.id)
    );
  }
}
