import type { SupabaseClient } from "@supabase/supabase-js";
import type { IssueFrequency } from "@/lib/types/database";

export type AppSettings = {
  pdf_upload_weekday: number;
  default_issue_frequency: IssueFrequency;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pdf_upload_weekday: 0,
  default_issue_frequency: "weekly",
};

/** 0 = Sunday … 6 = Saturday (matches JS Date.getDay in Kuwait local date). */
export const WEEKDAYS_AR = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
] as const;

export async function getAppSettings(
  supabase: SupabaseClient
): Promise<AppSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("pdf_upload_weekday, default_issue_frequency")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return DEFAULT_APP_SETTINGS;

  return {
    pdf_upload_weekday: data.pdf_upload_weekday ?? 0,
    default_issue_frequency:
      (data.default_issue_frequency as IssueFrequency) ?? "weekly",
  };
}
