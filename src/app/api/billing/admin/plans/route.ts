import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { parsePlanDurationInput } from "@/lib/billing/validate-plan";

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .select("*")
    .order("sort_order")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: {
    name_ar?: string;
    name_en?: string;
    description_ar?: string;
    price_kwd?: number;
    duration_days?: number;
    is_lifetime?: boolean;
    is_active?: boolean;
    sort_order?: number;
    features?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const nameAr = body.name_ar?.trim();
  const price = Number(body.price_kwd);
  const durationParsed = parsePlanDurationInput(body);

  if (!nameAr || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "الاسم والسعر مطلوبان" }, { status: 400 });
  }
  if (!durationParsed.ok) {
    return NextResponse.json({ error: durationParsed.error }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .insert({
      name_ar: nameAr,
      name_en: body.name_en?.trim() || null,
      description_ar: body.description_ar?.trim() || null,
      price_kwd: price,
      duration_days: durationParsed.durationDays,
      is_lifetime: durationParsed.isLifetime,
      is_active: body.is_active !== false,
      sort_order: Math.trunc(body.sort_order ?? 0),
      features: body.features ?? [],
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "create_subscription_plan",
    entityType: "subscription_plan",
    entityId: data.id,
    payload: { name_ar: nameAr, price_kwd: price },
  });

  return NextResponse.json({ plan: data });
}
