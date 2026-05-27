"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Link from "next/link";

export function IssueActions({
  issueId,
  publishedCount = 0,
  extractionStatus = "pending",
}: {
  issueId: string;
  publishedCount?: number;
  extractionStatus?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);

  const canStart =
    extractionStatus === "pending" || extractionStatus === "failed";

  async function startExtraction() {
    setLoading(true);
    try {
      const res = await fetch(`/api/issues/${issueId}/start-extraction`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          (data as { error?: string }).error ??
            "فشل بدء الاستخراج. تحقق من Inngest على Vercel."
        );
      }
    } catch {
      alert("فشل الاتصال بالخادم");
    }
    setLoading(false);
    router.refresh();
  }

  async function rerunExtraction() {
    setLoading(true);
    setShowRerunConfirm(false);
    try {
      const res = await fetch(`/api/issues/${issueId}/rerun`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(
          (data as { error?: string }).error ??
            "فشل بدء الاستخراج. تحقق من Inngest على Vercel."
        );
      }
    } catch {
      alert("فشل الاتصال بالخادم");
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href={`/content?issue=${issueId}`}>
        <Button variant="default">
          عرض المحتوى المنشور ({publishedCount})
        </Button>
      </Link>
      <Link href={`/issues/${issueId}/review`}>
        <Button variant="secondary">مراجعة يدوية (اختياري)</Button>
      </Link>
      {canStart && (
        <Button onClick={startExtraction} disabled={loading}>
          {loading ? "جاري البدء..." : "بدء الاستخراج"}
        </Button>
      )}
      <Button
        variant="outline"
        onClick={() => setShowRerunConfirm(true)}
        disabled={loading}
      >
        {loading ? "جاري إعادة التشغيل..." : "إعادة الاستخراج"}
      </Button>

      <ConfirmDialog
        open={showRerunConfirm}
        title="إعادة الاستخراج"
        description="سيتم حذف المسودات والمحتوى المنشور من هذا الإصدار وإعادة معالجة ملف PDF بالكامل. هل تريد المتابعة؟"
        confirmLabel="متابعة"
        cancelLabel="إلغاء"
        variant="destructive"
        loading={loading}
        onConfirm={rerunExtraction}
        onCancel={() => setShowRerunConfirm(false)}
      />
    </div>
  );
}
