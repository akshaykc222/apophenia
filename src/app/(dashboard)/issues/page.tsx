import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  UploadIssueLink,
  UploadBlockedHint,
} from "@/components/issues/upload-issue-link";
import { Badge } from "@/components/ui/badge";
import { extractionStatusLabels } from "@/lib/status-labels";
import type { ExtractionStatus } from "@/lib/types/database";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function IssuesPage() {
  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("pdf_issues")
    .select("*")
    .order("created_at", { ascending: false });

  const issueIds = issues?.map((i) => i.id) ?? [];
  const draftCounts: Record<string, number> = {};
  const publishedCounts: Record<string, number> = {};

  if (issueIds.length > 0) {
    const { data: drafts } = await supabase
      .from("content_drafts")
      .select("issue_id")
      .in("issue_id", issueIds)
      .eq("status", "suggested");

    drafts?.forEach((d) => {
      draftCounts[d.issue_id] = (draftCounts[d.issue_id] ?? 0) + 1;
    });

    const { data: published } = await supabase
      .from("content_items")
      .select("issue_id")
      .in("issue_id", issueIds)
      .eq("is_published", true);

    published?.forEach((p) => {
      if (p.issue_id) publishedCounts[p.issue_id] = (publishedCounts[p.issue_id] ?? 0) + 1;
    });
  }

  const statusVariant = (s: ExtractionStatus) => {
    if (s === "ready") return "success" as const;
    if (s === "failed") return "danger" as const;
    if (s === "processing") return "warning" as const;
    return "default" as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">إصدارات الجريدة</h1>
        <div className="flex flex-col items-end gap-1">
          <UploadIssueLink className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-zinc-200">
            رفع PDF جديد
          </UploadIssueLink>
          <UploadBlockedHint />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right">تاريخ الإصدار</th>
              <th className="px-4 py-3 text-right">الملف</th>
              <th className="px-4 py-3 text-right">الصفحات</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">مسودات</th>
              <th className="px-4 py-3 text-right">منشور</th>
              <th className="px-4 py-3 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {issues?.map((issue) => (
              <tr key={issue.id} className="border-t border-zinc-800 hover:bg-zinc-950/50">
                <td className="px-4 py-3">
                  {format(new Date(issue.issue_date), "d MMM yyyy", { locale: ar })}
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate">
                  {issue.original_filename ?? "—"}
                </td>
                <td className="px-4 py-3">{issue.page_count ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(issue.extraction_status)}>
                    {extractionStatusLabels[issue.extraction_status as ExtractionStatus]}
                    {issue.extraction_status === "processing" &&
                      ` (${issue.extraction_progress}%)`}
                  </Badge>
                </td>
                <td className="px-4 py-3">{draftCounts[issue.id] ?? 0}</td>
                <td className="px-4 py-3">{publishedCounts[issue.id] ?? 0}</td>
                <td className="px-4 py-3">
                  <Link href={`/issues/${issue.id}`} className="text-white hover:underline">
                    عرض
                  </Link>
                </td>
              </tr>
            ))}
            {!issues?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  لا توجد إصدارات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
