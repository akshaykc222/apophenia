import { createClient } from "@/lib/supabase/server";
import { ReferenceTable } from "@/components/reference/reference-table";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        ثلاثة تصنيفات فقط (تبويبات التطبيق). عند كل رفع PDF تُدمَج التصنيفات المكررة القديمة تلقائياً وتُحذف الزائدة.
      </p>
    <ReferenceTable
      table="categories"
      title="التصنيفات"
      slugFrom="name_en"
      fields={[
        { key: "name_ar", label: "الاسم (عربي)" },
        { key: "name_en", label: "الاسم (إنجليزي)" },
        { key: "sort_order", label: "الترتيب", type: "number" },
        { key: "badge_emoji", label: "إيموجي" },
        { key: "is_trending", label: "رائج", type: "checkbox" },
      ]}
      rows={rows ?? []}
    />
    </div>
  );
}
