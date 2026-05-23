import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { ReferenceResolver } from "@/lib/reference/ensure-entities";
import { STALE_REFERENCE_DAYS } from "@/lib/reference/stale";

const ALLOWED = ["ministries", "tender_categories"] as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const table = body.table as (typeof ALLOWED)[number] | undefined;

  if (!table || !ALLOWED.includes(table)) {
    return NextResponse.json(
      { error: "حدد table: ministries أو tender_categories" },
      { status: 400 }
    );
  }

  const days = Number(body.days ?? STALE_REFERENCE_DAYS);
  const staleBefore = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const service = createServiceClient();
  const resolver = new ReferenceResolver(service);
  const removed = await resolver.pruneStaleReferenceRows(table, staleBefore);

  return NextResponse.json({ ok: true, removed, table, staleBefore });
}
