import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import {
  countActiveSubscriptions,
  fetchEnrolledSubscriptions,
} from "@/lib/billing/admin-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function EnrolledSubscriptionsPage() {
  const service = createServiceClient();
  let rows: Awaited<ReturnType<typeof fetchEnrolledSubscriptions>> = [];
  let loadError: string | null = null;

  try {
    rows = await fetchEnrolledSubscriptions(service);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "فشل التحميل";
  }

  const activeCount = countActiveSubscriptions(rows);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المشتركون</h1>
          <p className="mt-1 text-sm text-zinc-500">
            مستخدمو التطبيق المسجّلون في خطط الاشتراك (نشط ومنتهي).
          </p>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/subscriptions/plans" className="hover:text-white">
            خطط الاشتراك
          </Link>
          <Link href="/subscriptions/transactions" className="hover:text-white">
            المعاملات
          </Link>
        </div>
      </div>

      {loadError && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {loadError.includes("does not exist")
            ? "نفّذ migrations 012 و 013 في Supabase."
            : loadError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">
            اشتراكات نشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{activeCount}</p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right font-medium">المستخدم</th>
              <th className="px-4 py-3 text-right font-medium">الخطة</th>
              <th className="px-4 py-3 text-right font-medium">الحالة</th>
              <th className="px-4 py-3 text-right font-medium">البداية</th>
              <th className="px-4 py-3 text-right font-medium">الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/80">
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {row.user_display_name || "—"}
                  </p>
                  <p className="text-xs text-zinc-500" dir="ltr">
                    {row.user_email}
                  </p>
                </td>
                <td className="px-4 py-3">{row.plan_name_ar}</td>
                <td className="px-4 py-3">{row.status_label}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {format(new Date(row.starts_at), "d MMM yyyy", {
                    locale: ar,
                  })}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.is_lifetime
                    ? "مدى الحياة"
                    : format(new Date(row.expires_at), "d MMM yyyy", {
                        locale: ar,
                      })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  لا يوجد مشتركون بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
