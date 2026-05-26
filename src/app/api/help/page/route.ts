import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { DEFAULT_HELP_PAGE } from "@/lib/help/types";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_help_page")
    .select("id, title_ar, intro_ar, contact_email, contact_phone, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ page: data ?? DEFAULT_HELP_PAGE });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: {
    title_ar?: string;
    intro_ar?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON غير صالح" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_by: user.id };

  if (body.title_ar !== undefined) {
    const title = body.title_ar.trim();
    if (!title) {
      return NextResponse.json({ error: "عنوان الصفحة مطلوب" }, { status: 400 });
    }
    updates.title_ar = title;
  }

  if (body.intro_ar !== undefined) {
    updates.intro_ar =
      body.intro_ar === null || String(body.intro_ar).trim() === ""
        ? null
        : String(body.intro_ar).trim();
  }

  if (body.contact_email !== undefined) {
    updates.contact_email =
      body.contact_email === null || String(body.contact_email).trim() === ""
        ? null
        : String(body.contact_email).trim();
  }

  if (body.contact_phone !== undefined) {
    updates.contact_phone =
      body.contact_phone === null || String(body.contact_phone).trim() === ""
        ? null
        : String(body.contact_phone).trim();
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_help_page")
    .update(updates)
    .eq("id", 1)
    .select("id, title_ar, intro_ar, contact_email, contact_phone, updated_at")
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
    action: "update_help_page",
    entityType: "app_help_page",
    entityId: "1",
    payload: updates,
  });

  return NextResponse.json({ page: data });
}
