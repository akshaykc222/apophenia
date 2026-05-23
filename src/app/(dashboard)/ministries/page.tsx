import { createClient } from "@/lib/supabase/server";
import { ReferenceTable } from "@/components/reference/reference-table";

export default async function MinistriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("ministries").select("*").order("name_ar");

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        تُنشأ الجهات تلقائياً من PDF. عند رفع إصدار جديد تُحدَّث «آخر ظهور» للجهات المذكورة فقط؛
        القديمة تُخفى ويمكن حذفها دفعة واحدة.
      </p>
    <ReferenceTable
      table="ministries"
      title="الجهات / الوزارات"
      supportsStaleFilter
      slugFrom="name_en"
      fields={[
        { key: "name_ar", label: "الاسم (عربي)" },
        { key: "name_en", label: "الاسم (إنجليزي)" },
        { key: "logo_url", label: "رابط الشعار" },
      ]}
      rows={rows ?? []}
    />
    </div>
  );
}
