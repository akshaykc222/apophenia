import { createServiceClient } from "@/lib/supabase/server";
import { getCaptConfig } from "@/lib/capt/config";
import { CaptTendersManager } from "@/components/capt/capt-tenders-manager";
import type { CaptTenderRow } from "@/lib/capt/types";

export default async function CaptTendersPage() {
  const service = createServiceClient();
  const config = getCaptConfig();

  let tenders: CaptTenderRow[] = [];
  let loadError: string | null = null;
  let counts = { open: 0, latest: 0, expired: 0 };

  try {
    const { data, error } = await service
      .from("capt_tenders")
      .select(
        "id, external_ref, title_ar, title_en, ministry_name, tender_type, published_at, deadline_at, detail_url, status, is_latest, first_seen_at, last_seen_at, created_at"
      )
      .order("last_seen_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    tenders = (data ?? []) as CaptTenderRow[];
    counts = {
      open: tenders.filter((t) => t.status === "open").length,
      latest: tenders.filter((t) => t.is_latest && t.status === "open").length,
      expired: tenders.filter((t) => t.status === "expired").length,
    };
  } catch (e) {
    loadError = e instanceof Error ? e.message : "فشل التحميل";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">مناقصات CAPT</h1>
        <p className="mt-1 text-sm text-zinc-500">
          مزامنة يومية من الجهاز المركزي للمناقصات العامة — أحدث الدفعة وانتهاء
          القديم.
        </p>
      </div>

      <CaptTendersManager
        tenders={tenders}
        config={{
          firecrawlConfigured: config.isFirecrawlConfigured,
          tendersUrl: config.tendersUrl,
        }}
        counts={counts}
        loadError={loadError}
      />
    </div>
  );
}
