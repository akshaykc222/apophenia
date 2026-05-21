"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import Link from "next/link";

export function IssueActions({
  issueId,
  publishedCount = 0,
}: {
  issueId: string;
  publishedCount?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);

  async function rerunExtraction() {
    setLoading(true);
    setShowRerunConfirm(false);
    await fetch(`/api/issues/${issueId}/rerun`, { method: "POST" });
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
