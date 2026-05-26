import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MOBILE_CHAT_DEVELOPER_REPLY,
  MOBILE_CHAT_OUT_OF_SCOPE_REPLY,
  MOBILE_CHAT_SYSTEM_PROMPT,
} from "@/lib/ai/mobile-chat-prompt";

export type MobileChatSettings = {
  enabled: boolean;
  system_prompt: string;
  out_of_scope_reply: string;
  developer_reply: string;
  temperature: number;
  max_tokens: number;
};

export const DEFAULT_MOBILE_CHAT_SETTINGS: MobileChatSettings = {
  enabled: true,
  system_prompt: MOBILE_CHAT_SYSTEM_PROMPT,
  out_of_scope_reply: MOBILE_CHAT_OUT_OF_SCOPE_REPLY,
  developer_reply: MOBILE_CHAT_DEVELOPER_REPLY,
  temperature: 0.6,
  max_tokens: 700,
};

type Row = {
  mobile_chat_enabled: boolean | null;
  mobile_chat_system_prompt: string | null;
  mobile_chat_out_of_scope_reply: string | null;
  mobile_chat_developer_reply: string | null;
  mobile_chat_temperature: number | null;
  mobile_chat_max_tokens: number | null;
};

export function resolveMobileChatSettings(row: Row | null): MobileChatSettings {
  if (!row) return DEFAULT_MOBILE_CHAT_SETTINGS;
  return {
    enabled: row.mobile_chat_enabled ?? true,
    system_prompt:
      row.mobile_chat_system_prompt?.trim() || MOBILE_CHAT_SYSTEM_PROMPT,
    out_of_scope_reply:
      row.mobile_chat_out_of_scope_reply?.trim() ||
      MOBILE_CHAT_OUT_OF_SCOPE_REPLY,
    developer_reply:
      row.mobile_chat_developer_reply?.trim() || MOBILE_CHAT_DEVELOPER_REPLY,
    temperature: row.mobile_chat_temperature ?? 0.6,
    max_tokens: row.mobile_chat_max_tokens ?? 700,
  };
}

/** Read via service role — mobile users cannot read app_settings (admin RLS). */
export async function getMobileChatSettings(
  supabase: SupabaseClient
): Promise<MobileChatSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "mobile_chat_enabled, mobile_chat_system_prompt, mobile_chat_out_of_scope_reply, mobile_chat_developer_reply, mobile_chat_temperature, mobile_chat_max_tokens"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getMobileChatSettings:", error.message);
    return DEFAULT_MOBILE_CHAT_SETTINGS;
  }

  return resolveMobileChatSettings(data as Row | null);
}

export type MobileChatSettingsInput = {
  mobile_chat_enabled?: boolean;
  mobile_chat_system_prompt?: string | null;
  mobile_chat_out_of_scope_reply?: string | null;
  mobile_chat_developer_reply?: string | null;
  mobile_chat_temperature?: number;
  mobile_chat_max_tokens?: number;
};

export function validateMobileChatPatch(
  input: MobileChatSettingsInput
): string | null {
  if (input.mobile_chat_temperature !== undefined) {
    const t = input.mobile_chat_temperature;
    if (typeof t !== "number" || t < 0 || t > 2) {
      return "درجة الحرارة (temperature) يجب أن تكون بين 0 و 2";
    }
  }
  if (input.mobile_chat_max_tokens !== undefined) {
    const n = input.mobile_chat_max_tokens;
    if (!Number.isInteger(n) || n < 100 || n > 2000) {
      return "الحد الأقصى للرموز يجب أن يكون بين 100 و 2000";
    }
  }
  const maxLen = 12000;
  for (const field of [
    "mobile_chat_system_prompt",
    "mobile_chat_out_of_scope_reply",
    "mobile_chat_developer_reply",
  ] as const) {
    const v = input[field];
    if (v != null && String(v).length > maxLen) {
      return `النص طويل جداً (${field})`;
    }
  }
  return null;
}
