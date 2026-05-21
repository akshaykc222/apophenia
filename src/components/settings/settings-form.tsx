"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKDAYS_AR, type AppSettings } from "@/lib/settings/app-settings";
import type { IssueFrequency } from "@/lib/types/database";

type SettingsFormProps = {
  initial: AppSettings;
};

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [pdfUploadWeekday, setPdfUploadWeekday] = useState(
    String(initial.pdf_upload_weekday)
  );
  const [defaultFrequency, setDefaultFrequency] = useState<IssueFrequency>(
    initial.default_issue_frequency
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_upload_weekday: Number(pdfUploadWeekday),
          default_issue_frequency: defaultFrequency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الحفظ");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
          تم حفظ الإعدادات.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>رفع إصدارات الجريدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-upload-weekday">يوم رفع PDF الأسبوعي</Label>
            <Select
              id="pdf-upload-weekday"
              value={pdfUploadWeekday}
              onChange={(e) => setPdfUploadWeekday(e.target.value)}
            >
              {WEEKDAYS_AR.map((label, index) => (
                <option key={index} value={String(index)}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-zinc-500">
              يُسمح برفع ملف كويت اليوم في هذا اليوم فقط (توقيت الكويت). باقي
              الأيام يُعطّل زر الرفع تلقائياً.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الإصدارات الجديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default-frequency">التكرار الافتراضي</Label>
            <Select
              id="default-frequency"
              value={defaultFrequency}
              onChange={(e) =>
                setDefaultFrequency(e.target.value as IssueFrequency)
              }
            >
              <option value="weekly">أسبوعي</option>
              <option value="daily">يومي</option>
            </Select>
            <p className="text-xs text-zinc-500">
              القيمة المُختارة مسبقاً عند رفع إصدار جديد من صفحة الرفع.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </form>
  );
}
