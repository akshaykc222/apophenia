import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import {
  countActiveSubscriptions,
  fetchEnrolledSubscriptions,
} from "@/lib/billing/admin-data";

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    const service = createServiceClient();
    const subscriptions = await fetchEnrolledSubscriptions(service);
    const active_count = countActiveSubscriptions(subscriptions);

    return NextResponse.json({ subscriptions, active_count });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل التحميل";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
