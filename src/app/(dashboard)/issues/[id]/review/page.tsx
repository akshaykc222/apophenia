import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "@/components/issues/review-queue";
import type { ContentDraft } from "@/lib/types/database";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: issue } = await supabase
    .from("pdf_issues")
    .select("id, original_filename, extraction_status")
    .eq("id", id)
    .single();

  if (!issue) notFound();

  const { data: drafts } = await supabase
    .from("content_drafts")
    .select("*")
    .eq("issue_id", id)
    .order("page_start", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/issues/${id}`} className="text-sm text-zinc-500 hover:text-white">
            ← العودة للإصدار
          </Link>
          <h1 className="mt-2 text-2xl font-bold">مراجعة يدوية (اختياري)</h1>
          <p className="text-zinc-500">
            {issue.original_filename} — النشر التلقائي مفعّل؛ استخدم هذا فقط للتعديل اليدوي
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <ReviewQueue issueId={id} drafts={(drafts ?? []) as ContentDraft[]} />
      </div>
    </div>
  );
}
