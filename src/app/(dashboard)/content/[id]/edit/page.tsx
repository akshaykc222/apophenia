import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentEditorForm } from "@/components/content/content-editor-form";
import type { Category, Ministry, TenderCategory, ContentType } from "@/lib/types/database";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) notFound();

  const [{ data: categories }, { data: ministries }, { data: tenderCategories }] =
    await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("ministries").select("*").order("name_ar"),
      supabase.from("tender_categories").select("*").order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">تحرير المحتوى</h1>
      <ContentEditorForm
        mode="edit"
        itemId={id}
        initial={{
          content_type: item.content_type as ContentType,
          category_id: item.category_id,
          ministry_id: item.ministry_id,
          tender_category_id: item.tender_category_id,
          title_ar: item.title_ar,
          summary_ar: item.summary_ar,
          body_ar: item.body_ar,
          tags: item.tags,
          source_name: item.source_name,
          source_logo_url: item.source_logo_url,
          is_featured: item.is_featured,
          is_published: item.is_published,
          published_at: item.published_at,
          deadline_at: item.deadline_at,
          application_url: item.application_url,
        }}
        categories={(categories ?? []) as Category[]}
        ministries={(ministries ?? []) as Ministry[]}
        tenderCategories={(tenderCategories ?? []) as TenderCategory[]}
      />
    </div>
  );
}
