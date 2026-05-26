import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

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

  let body: {
    title_ar?: string;
    body_ar?: string;
    sort_order?: number;
    is_published?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.title_ar !== undefined) {
    const title = body.title_ar.trim();
    if (!title) {
      return NextResponse.json({ error: "العنوان مطلوب" }, { status: 400 });
    }
    updates.title_ar = title;
  }

  if (body.body_ar !== undefined) {
    const text = body.body_ar.trim();
    if (!text) {
      return NextResponse.json({ error: "النص مطلوب" }, { status: 400 });
    }
    updates.body_ar = text;
  }

  if (body.sort_order !== undefined) {
    if (!Number.isFinite(body.sort_order)) {
      return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
    }
    updates.sort_order = Math.trunc(body.sort_order);
  }

  if (body.is_published !== undefined) {
    updates.is_published = Boolean(body.is_published);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_help_items")
    .update(updates)
    .eq("id", id)
    .select("id, title_ar, body_ar, sort_order, is_published, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "update_help_item",
    entityType: "app_help_item",
    entityId: id,
    payload: updates,
  });

  return NextResponse.json({ item: data });
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
  const { error } = await service.from("app_help_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "delete_help_item",
    entityType: "app_help_item",
    entityId: id,
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
