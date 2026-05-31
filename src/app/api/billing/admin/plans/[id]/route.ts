import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import { parsePlanDurationInput } from "@/lib/billing/validate-plan";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name_ar === "string") patch.name_ar = body.name_ar.trim();
  if (typeof body.name_en === "string") patch.name_en = body.name_en.trim() || null;
  if (typeof body.description_ar === "string") {
    patch.description_ar = body.description_ar.trim() || null;
  }
  if (body.price_kwd !== undefined) {
    const price = Number(body.price_kwd);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "السعر غير صالح" }, { status: 400 });
    }
    patch.price_kwd = price;
  }
  if (body.is_lifetime !== undefined || body.duration_days !== undefined) {
    const parsed = parsePlanDurationInput({
      is_lifetime: body.is_lifetime === true,
      duration_days:
        body.duration_days !== undefined
          ? Number(body.duration_days)
          : body.is_lifetime === true
            ? null
            : undefined,
    });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    patch.is_lifetime = parsed.isLifetime;
    patch.duration_days = parsed.durationDays;
  }
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (body.sort_order !== undefined) patch.sort_order = Math.trunc(Number(body.sort_order));
  if (Array.isArray(body.features)) patch.features = body.features;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "update_subscription_plan",
    entityType: "subscription_plan",
    entityId: id,
    payload: patch,
  });

  return NextResponse.json({ plan: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "deactivate_subscription_plan",
    entityType: "subscription_plan",
    entityId: data.id,
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
