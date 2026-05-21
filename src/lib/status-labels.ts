import type { ExtractionStatus, DraftStatus } from "@/lib/types/database";

export const extractionStatusLabels: Record<ExtractionStatus, string> = {
  pending: "في الانتظار",
  processing: "جاري الاستخراج",
  ready: "اكتمل — منشور تلقائياً",
  failed: "فشل",
};

export const draftStatusLabels: Record<DraftStatus, string> = {
  suggested: "مقترح",
  accepted: "مقبول",
  rejected: "مرفوض",
};

export const contentTypeLabels = {
  article: "مقال",
  tender: "مناقصة",
  decree: "مرسوم",
  addendum: "استدراك",
} as const;
