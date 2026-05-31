"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaptTenderRow } from "@/lib/capt/types";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type Props = {
  tenders: CaptTenderRow[];
  config: {
    firecrawlConfigured: boolean;
    tendersUrl: string;
  };
  counts: { open: number; latest: number; expired: number };
  loadError: string | null;
};

export function CaptTendersManager({
  tenders,
  config,
  counts,
  loadError,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/capt/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSyncError(data.error ?? "فشل المزامنة");
        return;
      }
      setSyncResult(
        `تم: ${data.fetched} من CAPT — جديد ${data.inserted}، محدّث ${data.updated}، منتهي ${data.expired}`
      );
      router.refresh();
    } catch {
      setSyncError("فشل الاتصال");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {loadError.includes("does not exist")
            ? "نفّذ migration 014_capt_tenders.sql في Supabase."
            : loadError}
        </p>
      )}

      {!config.firecrawlConfigured && (
        <p className="rounded-lg bg-amber-900/30 p-3 text-sm text-amber-200">
          أضف <code className="text-amber-100">FIRECRAWL_API_KEY</code> في
          Vercel —{" "}
          <a
            href="https://firecrawl.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            firecrawl.dev
          </a>{" "}
          (500 رصيد مجاني للتجربة). المزامنة اليومية عبر Inngest الساعة 5:00
          UTC.
        </p>
      )}

      {syncError && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {syncError}
        </p>
      )}
      {syncResult && (
        <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
          {syncResult}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runSync} disabled={syncing}>
          {syncing ? "جاري المزامنة…" : "مزامنة الآن"}
        </Button>
        <span className="text-xs text-zinc-500" dir="ltr">
          {config.tendersUrl}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">نشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{counts.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">أحدث دفعة</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{counts.latest}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-400">منتهية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{counts.expired}</p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right">العنوان</th>
              <th className="px-4 py-3 text-right">الجهة</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">آخر موعد</th>
              <th className="px-4 py-3 text-right">آخر ظهور</th>
            </tr>
          </thead>
          <tbody>
            {tenders.map((t) => (
              <tr key={t.id} className="border-b border-zinc-800/80">
                <td className="px-4 py-3">
                  {t.detail_url ? (
                    <a
                      href={t.detail_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white"
                    >
                      {t.title_ar}
                    </a>
                  ) : (
                    t.title_ar
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {t.ministry_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {t.status === "open" ? (
                    <span className="text-emerald-400">
                      {t.is_latest ? "نشط · أحدث" : "نشط"}
                    </span>
                  ) : (
                    <span className="text-zinc-500">منتهي</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {t.deadline_at
                    ? format(new Date(t.deadline_at), "d MMM yyyy", {
                        locale: ar,
                      })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {format(new Date(t.last_seen_at), "d MMM yyyy HH:mm", {
                    locale: ar,
                  })}
                </td>
              </tr>
            ))}
            {!tenders.length && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  لا توجد مناقصات CAPT بعد. اضغط «مزامنة الآن».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
