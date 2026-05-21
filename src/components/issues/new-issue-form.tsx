"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueFrequency } from "@/lib/types/database";

type NewIssueFormProps = {
  uploadAllowed: boolean;
  uploadBlockedMessage: string;
  defaultFrequency: IssueFrequency;
};

export function NewIssueForm({
  uploadAllowed,
  uploadBlockedMessage,
  defaultFrequency,
}: NewIssueFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [frequency, setFrequency] = useState(defaultFrequency);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadAllowed) {
      setError(uploadBlockedMessage);
      return;
    }
    if (!file) {
      setError("يرجى اختيار ملف PDF");
      return;
    }

    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("حجم الملف أكبر من 50 م.ب");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("issue_date", issueDate);
    formData.append("frequency", frequency);
    if (notes) formData.append("notes", notes);

    try {
      const res = await fetch("/api/issues/upload", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data: { error?: string; issue?: { id: string } } = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          setError(
            "استجابة غير صالحة من الخادم. أعد تشغيل npm run dev بعد تحديث next.config."
          );
          setLoading(false);
          return;
        }
      }

      if (!res.ok) {
        setError(data.error ?? `فشل الرفع (${res.status})`);
        setLoading(false);
        return;
      }

      if (!data.issue?.id) {
        setError("لم يُرجع الخادم معرف الإصدار");
        setLoading(false);
        return;
      }

      router.push(`/issues/${data.issue.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الاتصال بالخادم");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">رفع إصدار جديد</h1>

      {!uploadAllowed && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          {uploadBlockedMessage}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>ملف كويت اليوم (PDF)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <div
              className={`flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/50 p-6 transition-colors ${
                uploadAllowed ? "cursor-pointer hover:border-zinc-500" : "opacity-50"
              }`}
              onDragOver={(e) => uploadAllowed && e.preventDefault()}
              onDrop={(e) => {
                if (!uploadAllowed) return;
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f?.type === "application/pdf") setFile(f);
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                id="pdf-upload"
                disabled={!uploadAllowed}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="pdf-upload"
                className={
                  uploadAllowed
                    ? "cursor-pointer text-center"
                    : "pointer-events-none text-center"
                }
              >
                {file ? (
                  <span className="text-white">
                    {file.name}
                    <span className="mt-1 block text-xs text-zinc-500">
                      {(file.size / (1024 * 1024)).toFixed(1)} م.ب — الحد الأقصى 50
                      م.ب
                    </span>
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    اسحب ملف PDF هنا أو انقر للاختيار
                  </span>
                )}
              </label>
            </div>

            <div className="space-y-2">
              <Label>تاريخ الإصدار</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>التكرار</Label>
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as IssueFrequency)}
              >
                <option value="weekly">أسبوعي</option>
                <option value="daily">يومي</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات داخلية</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <p className="text-xs text-zinc-500">
              بعد الرفع: استخراج تلقائي + نشر مباشر في التطبيق (بدون مراجعة يدوية).
            </p>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !uploadAllowed}
            >
              {loading ? "جاري الرفع والنشر التلقائي..." : "رفع ونشر تلقائي"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
