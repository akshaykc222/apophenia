"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import type { ExtractionStatus } from "@/lib/types/database";

export function IssueProgressPoller({
  issueId,
  status,
  progress,
}: {
  issueId: string;
  status: ExtractionStatus;
  progress: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "processing" && status !== "pending") return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [status, router, issueId]);

  if (status !== "processing" && status !== "pending") return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-400">جاري استخراج النص — يتم التحديث تلقائياً</p>
      <Progress value={progress} />
    </div>
  );
}
