import { createClient } from "@/lib/supabase/server";
import { ReferenceTable } from "@/components/reference/reference-table";

export default async function TenderCategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("tender_categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        تُنشأ من PDF. التصنيفات غير المذكورة في آخر رفع تُعتبر قديمة — يمكن إخفاؤها أو حذفها.
      </p>
    <ReferenceTable
      table="tender_categories"
      title="تصنيفات المناقصات"
      supportsStaleFilter
      slugFrom="name_en"
      fields={[
        { key: "name_ar", label: "الاسم (عربي)" },
        { key: "name_en", label: "الاسم (إنجليزي)" },
        { key: "sort_order", label: "الترتيب", type: "number" },
      ]}
      rows={rows ?? []}
    />
    </div>
  );
}
