import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 200);
  const status = request.nextUrl.searchParams.get("status");

  const service = createServiceClient();
  let query = service
    .from("payment_transactions")
    .select(
      "id, user_id, plan_id, status, amount_kwd, invoice_id, payment_id, paid_at, created_at, plan:subscription_plans(name_ar)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: data ?? [] });
}
