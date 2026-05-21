import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { contentTypeLabels } from "@/lib/status-labels";
import type { ContentType } from "@/lib/types/database";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ContentSearch } from "@/components/content/content-search";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; issue?: string }>;
}) {
  const { q, type, issue: issueId } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("content_items")
    .select("*, categories(name_ar), ministries(name_ar)")
    .order("published_at", { ascending: false });

  if (issueId) query = query.eq("issue_id", issueId);
  if (type) query = query.eq("content_type", type);
  if (q) query = query.ilike("search_text", `%${q}%`);

  const { data: items } = await query.limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المحتوى المنشور</h1>
          {issueId && (
            <p className="text-sm text-zinc-500">مفلتر حسب إصدار الجريدة</p>
          )}
        </div>
        <Link href="/content/new">
          <Button>إضافة يدوياً</Button>
        </Link>
      </div>

      <ContentSearch initialQ={q} initialType={type} />

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right">العنوان</th>
              <th className="px-4 py-3 text-right">النوع</th>
              <th className="px-4 py-3 text-right">التصنيف</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id} className="border-t border-zinc-800">
                <td className="max-w-xs truncate px-4 py-3">{item.title_ar}</td>
                <td className="px-4 py-3">
                  <Badge>{contentTypeLabels[item.content_type as ContentType]}</Badge>
                </td>
                <td className="px-4 py-3">
                  {(item.categories as { name_ar: string } | null)?.name_ar ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.is_published ? "success" : "default"}>
                    {item.is_published ? "منشور" : "مسودة"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {item.published_at
                    ? format(new Date(item.published_at), "d MMM yyyy", { locale: ar })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/content/${item.id}/edit`} className="hover:underline">
                    تحرير
                  </Link>
                </td>
              </tr>
            ))}
            {!items?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  لا يوجد محتوى
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
