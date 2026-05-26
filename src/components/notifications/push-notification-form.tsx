"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AppUser = {
  id: string;
  email: string;
  display_name: string | null;
  has_device_token: boolean;
};

export function PushNotificationForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<"all" | "selected">("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const loadUsers = useCallback(async (q: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(
        `/api/notifications/users${q ? `?q=${encodeURIComponent(q)}` : ""}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل تحميل المستخدمين");
        return;
      }
      setUsers(data.users ?? []);
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (targetType === "selected") {
      loadUsers(search);
    }
  }, [targetType, search, loadUsers]);

  function toggleUser(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          target_type: targetType,
          user_ids: targetType === "selected" ? [...selected] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الإرسال");
        return;
      }
      setResult(
        `تم الإرسال: ${data.successCount ?? 0} نجاح، ${data.failureCount ?? 0} فشل، ${data.devicesTargeted ?? 0} جهاز`
      );
      setTitle("");
      setBody("");
      setSelected(new Set());
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}
      {result && (
        <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
          {result}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>محتوى الإشعار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="push-title">العنوان</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              dir="rtl"
              placeholder="مثال: مناقصة جديدة"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="push-body">النص</Label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              dir="rtl"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>المستلمون</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                checked={targetType === "all"}
                onChange={() => setTargetType("all")}
              />
              كل مستخدمي التطبيق (موضوع FCM + سجل داخل التطبيق)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="target"
                checked={targetType === "selected"}
                onChange={() => setTargetType("selected")}
              />
              مستخدمون محددون
            </label>
          </div>

          {targetType === "selected" && (
            <>
              <Input
                placeholder="بحث بالبريد أو الاسم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                dir="rtl"
              />
              <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800">
                {loadingUsers && (
                  <p className="p-4 text-sm text-zinc-500">جاري التحميل...</p>
                )}
                {!loadingUsers && users.length === 0 && (
                  <p className="p-4 text-sm text-zinc-500">لا مستخدمين</p>
                )}
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-zinc-800 px-4 py-3 hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleUser(u.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {u.display_name || u.email}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{u.email}</p>
                    </div>
                    <span
                      className={`text-xs ${u.has_device_token ? "text-emerald-400" : "text-zinc-600"}`}
                    >
                      {u.has_device_token ? "جهاز مسجّل" : "بدون جهاز"}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                المحدد: {selected.size} — الإشعار الفوري يصل للأجهزة المسجّلة فقط؛
                السجل داخل التطبيق يُحفظ لجميع المحددين.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={sending}>
        {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
      </Button>
    </form>
  );
}
