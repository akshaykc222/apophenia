import { createClient } from "@/lib/supabase/server";
import { ContentEditorForm } from "@/components/content/content-editor-form";
import type { Category, Ministry, TenderCategory } from "@/lib/types/database";

export default async function NewContentPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: ministries }, { data: tenderCategories }] =
    await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("ministries").select("*").order("name_ar"),
      supabase.from("tender_categories").select("*").order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">إضافة محتوى يدوياً</h1>
      <ContentEditorForm
        mode="create"
        categories={(categories ?? []) as Category[]}
        ministries={(ministries ?? []) as Ministry[]}
        tenderCategories={(tenderCategories ?? []) as TenderCategory[]}
      />
    </div>
  );
}
