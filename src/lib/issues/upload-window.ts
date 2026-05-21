import { WEEKDAYS_AR } from "@/lib/settings/app-settings";

/** Gazette PDF uploads use Kuwait local calendar date. */
export const PDF_UPLOAD_TIMEZONE = "Asia/Kuwait";

/** 0 = Sunday … 6 = Saturday */
export function getKuwaitWeekday(date: Date = new Date()): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: PDF_UPLOAD_TIMEZONE,
    weekday: "short",
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function isPdfUploadDay(
  allowedWeekday: number,
  date: Date = new Date()
): boolean {
  return getKuwaitWeekday(date) === allowedWeekday;
}

export function pdfUploadBlockedMessageAr(allowedWeekday: number): string {
  const day = WEEKDAYS_AR[allowedWeekday] ?? WEEKDAYS_AR[0];
  return `رفع ملف PDF متاح يوم ${day} فقط (توقيت الكويت).`;
}
