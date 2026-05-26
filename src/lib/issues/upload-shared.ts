import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppSettings } from "@/lib/settings/app-settings";
import { isPdfUploadDay, pdfUploadBlockedMessageAr } from "@/lib/issues/upload-window";
import { sanitizeStorageFilename } from "@/lib/utils";

export const MAX_PDF_BYTES = 50 * 1024 * 1024;

export async function assertPdfUploadAllowed(supabase: SupabaseClient) {
  const settings = await getAppSettings(supabase);
  if (!isPdfUploadDay(settings.pdf_upload_weekday)) {
    return {
      ok: false as const,
      status: 403,
      error: pdfUploadBlockedMessageAr(settings.pdf_upload_weekday),
    };
  }
  return { ok: true as const, settings };
}

export function buildIssueStoragePath(issueId: string, originalFilename: string) {
  const storageFilename = sanitizeStorageFilename(originalFilename);
  return {
    storagePath: `${issueId}/${storageFilename}`,
    storageFilename,
  };
}

export function validatePdfUploadMeta(input: {
  original_filename?: string;
  file_size_bytes?: number;
}) {
  const name = input.original_filename?.trim();
  const size = input.file_size_bytes;

  if (!name) {
    return { ok: false as const, error: "اسم الملف مطلوب" };
  }
  if (!name.toLowerCase().endsWith(".pdf")) {
    return { ok: false as const, error: "يجب أن يكون الملف PDF" };
  }
  if (size == null || !Number.isFinite(size) || size <= 0) {
    return { ok: false as const, error: "حجم الملف غير صالح" };
  }
  if (size > MAX_PDF_BYTES) {
    return { ok: false as const, error: "حجم الملف أكبر من 50 م.ب" };
  }
  return { ok: true as const, originalFilename: name, fileSizeBytes: size };
}
