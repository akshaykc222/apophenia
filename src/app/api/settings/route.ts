import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { getAppSettings, DEFAULT_APP_SETTINGS } from "@/lib/settings/app-settings";
import { logAudit } from "@/lib/audit";
import type { IssueFrequency } from "@/lib/types/database";

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const settings = await getAppSettings(supabase);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json();
  const pdf_upload_weekday = body.pdf_upload_weekday;
  const default_issue_frequency = body.default_issue_frequency;

  const updates: Record<string, unknown> = {
    updated_by: user.id,
  };

  if (pdf_upload_weekday !== undefined) {
    const day = Number(pdf_upload_weekday);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return NextResponse.json(
        { error: "يوم الرفع غير صالح" },
        { status: 400 }
      );
    }
    updates.pdf_upload_weekday = day;
  }

  if (default_issue_frequency !== undefined) {
    if (!["daily", "weekly"].includes(default_issue_frequency)) {
      return NextResponse.json(
        { error: "التكرار غير صالح" },
        { status: 400 }
      );
    }
    updates.default_issue_frequency = default_issue_frequency as IssueFrequency;
  }

  if (
    updates.pdf_upload_weekday === undefined &&
    updates.default_issue_frequency === undefined
  ) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_settings")
    .update(updates)
    .eq("id", 1)
    .select("pdf_upload_weekday, default_issue_frequency")
    .single();

  if (error) {
    if (error.code === "PGRST116" || error.message.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "جدول الإعدادات غير موجود. نفّذ migration 006_app_settings.sql في Supabase.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAudit(service, {
    actorId: user.id,
    action: "update_settings",
    entityType: "app_settings",
    entityId: "1",
    payload: updates,
  });

  return NextResponse.json({
    settings: data ?? DEFAULT_APP_SETTINGS,
  });
}
