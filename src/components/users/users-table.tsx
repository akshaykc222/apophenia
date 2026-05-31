"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AppUserRow } from "@/lib/users/app-users";

type UsersTableProps = {
  users: AppUserRow[];
};

export function UsersTable({ users }: UsersTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = u.email.toLowerCase();
      const name = (u.display_name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q);
    });
  }, [users, search]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="بحث بالبريد أو الاسم..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        dir="rtl"
        className="max-w-md"
      />

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right">تاريخ التسجيل</th>
              <th className="px-4 py-3 text-right">المستخدم</th>
              <th className="px-4 py-3 text-right">آخر دخول</th>
              <th className="px-4 py-3 text-right">الجهاز</th>
              <th className="px-4 py-3 text-right">الاشتراك</th>
              <th className="px-4 py-3 text-right">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                  {format(new Date(u.created_at), "d MMM yyyy", { locale: ar })}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{u.display_name || "—"}</p>
                  <p className="text-xs text-zinc-500" dir="ltr">
                    {u.email}
                  </p>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                  {u.last_sign_in_at
                    ? format(new Date(u.last_sign_in_at), "d MMM yyyy", {
                        locale: ar,
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  {u.has_device_token ? (
                    <span className="text-emerald-400">مسجّل</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.subscription_active ? (
                    <div>
                      <Badge variant="success">مشترك</Badge>
                      <p className="mt-1 text-xs text-zinc-500">
                        {u.subscription_plan_name ?? u.subscription_label}
                      </p>
                    </div>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.is_active ? (
                    <Badge variant="success">نشط</Badge>
                  ) : (
                    <Badge variant="default">غير نشط</Badge>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                  {users.length === 0
                    ? "لا مستخدمين للتطبيق بعد"
                    : "لا نتائج للبحث"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        المعروض: {filtered.length} من {users.length} — النشط: آخر {30} يوماً
        (دخول أو تحديث جهاز).
      </p>
    </div>
  );
}
