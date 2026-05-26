import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { getAppSettings, DEFAULT_APP_SETTINGS } from "@/lib/settings/app-settings";
import {
  validateMobileChatPatch,
  type MobileChatSettingsInput,
} from "@/lib/settings/mobile-chat-settings";
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
  const mobilePatch = {
    mobile_chat_enabled: body.mobile_chat_enabled,
    mobile_chat_system_prompt: body.mobile_chat_system_prompt,
    mobile_chat_out_of_scope_reply: body.mobile_chat_out_of_scope_reply,
    mobile_chat_developer_reply: body.mobile_chat_developer_reply,
    mobile_chat_temperature: body.mobile_chat_temperature,
    mobile_chat_max_tokens: body.mobile_chat_max_tokens,
  } as MobileChatSettingsInput;

  const chatValidation = validateMobileChatPatch(mobilePatch);
  if (chatValidation) {
    return NextResponse.json({ error: chatValidation }, { status: 400 });
  }

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

  if (mobilePatch.mobile_chat_enabled !== undefined) {
    updates.mobile_chat_enabled = Boolean(mobilePatch.mobile_chat_enabled);
  }
  if (mobilePatch.mobile_chat_system_prompt !== undefined) {
    updates.mobile_chat_system_prompt =
      mobilePatch.mobile_chat_system_prompt === null ||
      String(mobilePatch.mobile_chat_system_prompt).trim() === ""
        ? null
        : String(mobilePatch.mobile_chat_system_prompt).trim();
  }
  if (mobilePatch.mobile_chat_out_of_scope_reply !== undefined) {
    updates.mobile_chat_out_of_scope_reply =
      mobilePatch.mobile_chat_out_of_scope_reply === null ||
      String(mobilePatch.mobile_chat_out_of_scope_reply).trim() === ""
        ? null
        : String(mobilePatch.mobile_chat_out_of_scope_reply).trim();
  }
  if (mobilePatch.mobile_chat_developer_reply !== undefined) {
    updates.mobile_chat_developer_reply =
      mobilePatch.mobile_chat_developer_reply === null ||
      String(mobilePatch.mobile_chat_developer_reply).trim() === ""
        ? null
        : String(mobilePatch.mobile_chat_developer_reply).trim();
  }
  if (mobilePatch.mobile_chat_temperature !== undefined) {
    updates.mobile_chat_temperature = mobilePatch.mobile_chat_temperature;
  }
  if (mobilePatch.mobile_chat_max_tokens !== undefined) {
    updates.mobile_chat_max_tokens = mobilePatch.mobile_chat_max_tokens;
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("app_settings")
    .update(updates)
    .eq("id", 1)
    .select(
      "pdf_upload_weekday, default_issue_frequency, mobile_chat_enabled, mobile_chat_system_prompt, mobile_chat_out_of_scope_reply, mobile_chat_developer_reply, mobile_chat_temperature, mobile_chat_max_tokens"
    )
    .single();

  if (error) {
    if (error.code === "PGRST116" || error.message.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "جدول الإعدادات غير موجود. نفّذ migrations 006 و 008 في Supabase.",
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

  const row = data ?? null;
  return NextResponse.json({
    settings: row
      ? {
          pdf_upload_weekday: row.pdf_upload_weekday,
          default_issue_frequency: row.default_issue_frequency,
          mobile_chat: {
            enabled: row.mobile_chat_enabled,
            system_prompt: row.mobile_chat_system_prompt,
            out_of_scope_reply: row.mobile_chat_out_of_scope_reply,
            developer_reply: row.mobile_chat_developer_reply,
            temperature: row.mobile_chat_temperature,
            max_tokens: row.mobile_chat_max_tokens,
          },
        }
      : DEFAULT_APP_SETTINGS,
  });
}
