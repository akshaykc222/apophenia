import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";
import { fetchCaptTenders } from "./fetch-tenders";
import type { CaptSyncResult, CaptTenderInput } from "./types";

async function upsertTenders(
  supabase: SupabaseClient,
  tenders: CaptTenderInput[],
  seenAt: string
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const t of tenders) {
    const { data: existing } = await supabase
      .from("capt_tenders")
      .select("id")
      .eq("external_ref", t.external_ref)
      .maybeSingle();

    const row = {
      title_ar: t.title_ar,
      title_en: t.title_en ?? null,
      ministry_name: t.ministry_name ?? null,
      tender_type: t.tender_type ?? null,
      published_at: t.published_at ?? null,
      deadline_at: t.deadline_at ?? null,
      detail_url: t.detail_url ?? null,
      raw_data: t.raw_data ?? null,
      status: "open" as const,
      is_latest: true,
      last_seen_at: seenAt,
    };

    if (existing) {
      await supabase.from("capt_tenders").update(row).eq("id", existing.id);
      updated += 1;
    } else {
      await supabase.from("capt_tenders").insert({
        external_ref: t.external_ref,
        ...row,
        first_seen_at: seenAt,
      });
      inserted += 1;
    }
  }

  return { inserted, updated };
}

async function markStaleAndExpired(
  supabase: SupabaseClient,
  seenRefs: Set<string>,
  fetchedCount: number
): Promise<{ expired: number }> {
  const { data: openRows } = await supabase
    .from("capt_tenders")
    .select("id, external_ref, deadline_at")
    .eq("status", "open");

  let expired = 0;

  for (const row of openRows ?? []) {
    const pastDeadline =
      row.deadline_at && new Date(row.deadline_at).getTime() < Date.now();
    const notInLatest = fetchedCount > 0 && !seenRefs.has(row.external_ref);

    if (pastDeadline || notInLatest) {
      await supabase
        .from("capt_tenders")
        .update({
          status: "expired",
          is_latest: false,
        })
        .eq("id", row.id);
      expired += 1;
    }
  }

  return { expired };
}

/** Expire gazette tenders past deadline; mark latest from most recent issue. */
export async function syncGazetteTenderStatus(
  supabase: SupabaseClient
): Promise<{ expired: number; marked_latest: number }> {
  const now = new Date().toISOString();

  const { data: expiredRows } = await supabase
    .from("content_items")
    .update({ tender_status: "expired", is_latest: false })
    .eq("content_type", "tender")
    .eq("is_published", true)
    .not("deadline_at", "is", null)
    .lt("deadline_at", now)
    .select("id");

  await supabase
    .from("content_items")
    .update({ is_latest: false })
    .eq("content_type", "tender")
    .eq("is_published", true);

  const { data: latestIssue } = await supabase
    .from("pdf_issues")
    .select("id, issue_date")
    .order("issue_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let marked_latest = 0;
  if (latestIssue) {
    const { data: latestTenders } = await supabase
      .from("content_items")
      .update({ is_latest: true, tender_status: "open" })
      .eq("content_type", "tender")
      .eq("is_published", true)
      .eq("issue_id", latestIssue.id)
      .select("id");
    marked_latest = latestTenders?.length ?? 0;
  }

  return { expired: expiredRows?.length ?? 0, marked_latest };
}

export async function runCaptSync(
  supabase: SupabaseClient,
  actorId?: string | null
): Promise<CaptSyncResult> {
  const seenAt = new Date().toISOString();

  try {
    const { tenders, source } = await fetchCaptTenders();

    if (tenders.length === 0 && source === "none") {
      return {
        ok: false,
        fetched: 0,
        inserted: 0,
        updated: 0,
        marked_not_latest: 0,
        expired: 0,
        error: "CAPT sync disabled (CAPT_SYNC_ENABLED=false)",
        source,
      };
    }

    const { inserted, updated } = await upsertTenders(supabase, tenders, seenAt);
    const seenRefs = new Set(tenders.map((t) => t.external_ref));
    const { expired } = await markStaleAndExpired(
      supabase,
      seenRefs,
      tenders.length
    );

    const gazette = await syncGazetteTenderStatus(supabase);

    await logAudit(supabase, {
      actorId: actorId ?? null,
      action: "capt_sync",
      entityType: "capt_tenders",
      payload: {
        fetched: tenders.length,
        inserted,
        updated,
        expired,
        gazette_expired: gazette.expired,
        source,
      },
    });

    return {
      ok: true,
      fetched: tenders.length,
      inserted,
      updated,
      marked_not_latest: 0,
      expired: expired + gazette.expired,
      source,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "CAPT sync failed";
    await syncGazetteTenderStatus(supabase).catch(() => {});
    return {
      ok: false,
      fetched: 0,
      inserted: 0,
      updated: 0,
      marked_not_latest: 0,
      expired: 0,
      error: message,
      source: "none",
    };
  }
}
