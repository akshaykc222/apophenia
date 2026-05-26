import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { extractionStatusLabels } from "@/lib/status-labels";
import type { ExtractionStatus } from "@/lib/types/database";
import { IssueActions } from "@/components/issues/issue-actions";
import { IssueProgressPoller } from "@/components/issues/issue-progress";
import {
  ExtractionAlert,
  InngestSetupHint,
} from "@/components/issues/extraction-alert";
import { getExtractionStuckMessage } from "@/lib/issues/extraction-stuck";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: issue } = await supabase
    .from("pdf_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (!issue) notFound();

  const { count: draftCount } = await supabase
    .from("content_drafts")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", id)
    .eq("status", "suggested");

  const { count: publishedCount } = await supabase
    .from("content_items")
    .select("*", { count: "exact", head: true })
    .eq("issue_id", id)
    .eq("is_published", true);

  const { data: latestJob } = await supabase
    .from("extraction_jobs")
    .select("status, started_at")
    .eq("issue_id", id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const status = issue.extraction_status as ExtractionStatus;
  const stuckMessage =
    issue.error_message ||
    getExtractionStuckMessage(issue, latestJob ?? null) ||
    null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تفاصيل الإصدار</h1>
        <p className="text-zinc-500">{issue.original_filename}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">تاريخ الإصدار</CardTitle>
          </CardHeader>
          <CardContent>
            {format(new Date(issue.issue_date), "d MMMM yyyy", { locale: ar })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{extractionStatusLabels[status]}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">بانتظار مراجعة يدوية</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{draftCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">منشور</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{publishedCount ?? 0}</CardContent>
        </Card>
      </div>

      {stuckMessage && <ExtractionAlert message={stuckMessage} />}

      <Card>
        <CardHeader>
          <CardTitle>التقدم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(status === "pending" || status === "processing") && (
            <InngestSetupHint />
          )}
          <IssueProgressPoller
            issueId={id}
            status={status}
            progress={issue.extraction_progress}
          />
          <Progress value={issue.extraction_progress} />
          <p className="text-sm text-zinc-500">
            {issue.page_count ? `${issue.page_count} صفحة` : "جاري حساب الصفحات..."}
          </p>
          {status === "ready" && (
            <p className="text-sm text-emerald-400">
              اكتمل الاستخراج. تم نشر العناصر تلقائياً في المحتوى — يظهر في التطبيق مباشرة.
            </p>
          )}
          {status === "processing" && (
            <p className="text-sm text-zinc-400">
              جاري استخراج النص ونشر المحتوى تلقائياً…
            </p>
          )}
          {issue.error_message && (
            <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
              {issue.error_message}
            </p>
          )}
          {issue.notes && (
            <p className="text-sm text-zinc-400">ملاحظات: {issue.notes}</p>
          )}
        </CardContent>
      </Card>

      <IssueActions issueId={id} publishedCount={publishedCount ?? 0} />
    </div>
  );
}
