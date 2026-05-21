import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DraftEditorForm } from "@/components/content/draft-editor-form";
import type { ContentDraft, Category, Ministry, TenderCategory } from "@/lib/types/database";

export default async function DraftReviewPage({
  params,
}: {
  params: Promise<{ id: string; draftId: string }>;
}) {
  const { id, draftId } = await params;
  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("content_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("issue_id", id)
    .single();

  if (!draft) notFound();

  const [{ data: categories }, { data: ministries }, { data: tenderCategories }] =
    await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("ministries").select("*").order("name_ar"),
      supabase.from("tender_categories").select("*").order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/issues/${id}/review`}
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← العودة لقائمة المراجعة
      </Link>
      <h1 className="text-2xl font-bold">تحرير المسودة</h1>
      <DraftEditorForm
        draft={draft as ContentDraft}
        categories={(categories ?? []) as Category[]}
        ministries={(ministries ?? []) as Ministry[]}
        tenderCategories={(tenderCategories ?? []) as TenderCategory[]}
      />
    </div>
  );
}
