import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">سجل التدقيق</h1>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">الإجراء</th>
              <th className="px-4 py-3 text-right">النوع</th>
              <th className="px-4 py-3 text-right">المعرف</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-t border-zinc-800">
                <td className="px-4 py-3">
                  {format(new Date(log.created_at), "d MMM yyyy HH:mm", {
                    locale: ar,
                  })}
                </td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">{log.entity_type}</td>
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                  {log.entity_id?.slice(0, 8) ?? "—"}…
                </td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  لا سجلات بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
