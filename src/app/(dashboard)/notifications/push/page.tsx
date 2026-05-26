import { createServiceClient } from "@/lib/supabase/server";
import { PushNotificationForm } from "@/components/notifications/push-notification-form";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function PushNotificationsPage() {
  const service = createServiceClient();
  const { data: campaigns } = await service
    .from("push_campaigns")
    .select("id, title_ar, target_type, success_count, failure_count, devices_targeted, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">إرسال الإشعارات</h1>
        <p className="mt-1 text-sm text-zinc-500">
          إشعارات Firebase لتطبيق كويت اليوم — كل المستخدمين أو مستخدمين محددين.
        </p>
      </div>

      <PushNotificationForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">آخر الحملات</h2>
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">العنوان</th>
                <th className="px-4 py-3 text-right">الهدف</th>
                <th className="px-4 py-3 text-right">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {campaigns?.map((c) => (
                <tr key={c.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(c.created_at), "d MMM yyyy HH:mm", {
                      locale: ar,
                    })}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{c.title_ar}</td>
                  <td className="px-4 py-3">
                    {c.target_type === "all" ? "الكل" : "محدد"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {c.success_count}/{c.devices_targeted} جهاز
                  </td>
                </tr>
              ))}
              {!campaigns?.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    لا حملات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
