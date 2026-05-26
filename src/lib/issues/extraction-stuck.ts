import type { ExtractionStatus } from "@/lib/types/database";

type IssueRow = {
  extraction_status: string;
  page_count: number | null;
  extraction_progress: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type JobRow = {
  status: string;
  started_at: string | null;
} | null;

const STUCK_PENDING_MS = 2 * 60 * 1000;
const STUCK_PROCESSING_MS = 5 * 60 * 1000;

export function getExtractionStuckMessage(
  issue: IssueRow,
  latestJob: JobRow
): string | null {
  const status = issue.extraction_status as ExtractionStatus;
  const now = Date.now();
  const created = new Date(issue.created_at).getTime();
  const updated = new Date(issue.updated_at).getTime();

  if (issue.error_message?.includes("Inngest")) {
    return issue.error_message;
  }

  if (status === "pending") {
    const age = now - created;
    if (age > STUCK_PENDING_MS) {
      return (
        "لم يبدأ الاستخراج بعد. غالباً Inngest غير مربوط بـ Vercel — راجع الإعدادات أدناه ثم اضغط «إعادة الاستخراج»."
      );
    }
    return null;
  }

  if (status === "processing") {
    const noPages = issue.page_count == null || issue.page_count === 0;
    const noProgress = (issue.extraction_progress ?? 0) === 0;
    const age = now - updated;

    if (noPages && noProgress && age > STUCK_PROCESSING_MS) {
      if (!latestJob) {
        return (
          "الاستخراج متوقف — لا توجد مهمة نشطة. اضغط «إعادة الاستخراج» أو تحقق من Inngest على Vercel."
        );
      }
      if (latestJob.status === "running") {
        return (
          "الاستخراج يستغرق وقتاً طويلاً أو توقف. تحقق من لوحة Inngest أو أعد التشغيل."
        );
      }
    }
  }

  return null;
}
