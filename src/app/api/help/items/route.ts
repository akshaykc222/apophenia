import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_help_items")
    .select("id, title_ar, body_ar, sort_order, is_published, created_at, updated_at")
    .order("sort_order")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  const title = body.title_ar?.trim();
  const text = body.body_ar?.trim();

  if (!title || !text) {
    return NextResponse.json({ error: "العنوان والنص مطلوبان" }, { status: 400 });
  }

  const sortOrder = body.sort_order ?? 0;
  if (!Number.isFinite(sortOrder)) {
    return NextResponse.json({ error: "الترتيب غير صالح" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_help_items")
    .insert({
      title_ar: title,
      body_ar: text,
      sort_order: Math.trunc(sortOrder),
      is_published: body.is_published !== false,
    })
    .select("id, title_ar, body_ar, sort_order, is_published, created_at, updated_at")
    .single();

  if (error) {
    if (error.message.includes("does not exist")) {
      return NextResponse.json(
        { error: "نفّذ migration 010_app_help.sql في Supabase." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "create_help_item",
    entityType: "app_help_item",
    entityId: data.id,
    payload: { title_ar: title },
  });

  return NextResponse.json({ item: data });
}
