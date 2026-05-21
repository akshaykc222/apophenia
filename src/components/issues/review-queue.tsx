"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { draftStatusLabels, contentTypeLabels } from "@/lib/status-labels";
import type { ContentDraft, ContentType } from "@/lib/types/database";

export function ReviewQueue({
  issueId,
  drafts,
}: {
  issueId: string;
  drafts: ContentDraft[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkPublish() {
    setLoading(true);
    await fetch("/api/drafts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", draftIds: [...selected] }),
    });
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  async function bulkReject() {
    setLoading(true);
    await fetch("/api/drafts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", draftIds: [...selected] }),
    });
    setLoading(false);
    setSelected(new Set());
    router.refresh();
  }

  const suggested = drafts.filter((d) => d.status === "suggested");

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <span className="text-sm text-zinc-400">{selected.size} محدد</span>
          <Button size="sm" onClick={bulkPublish} disabled={loading}>
            نشر المحدد
          </Button>
          <Button size="sm" variant="destructive" onClick={bulkReject} disabled={loading}>
            رفض المحدد
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {suggested.map((draft) => {
          const conf = draft.confidence_score ?? 0;
          return (
            <li
              key={draft.id}
              className="flex items-start gap-3 rounded-xl border border-zinc-800 p-4 hover:bg-zinc-950/80"
            >
              <input
                type="checkbox"
                checked={selected.has(draft.id)}
                onChange={() => toggle(draft.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>
                    {contentTypeLabels[draft.content_type as ContentType]}
                  </Badge>
                  {conf > 0 && (
                    <Badge
                      variant={
                        conf >= 0.7 ? "success" : conf >= 0.5 ? "warning" : "default"
                      }
                    >
                      {Math.round(conf * 100)}%
                    </Badge>
                  )}
                  {draft.page_start && (
                    <span className="text-xs text-zinc-500">
                      ص {draft.page_start}–{draft.page_end}
                    </span>
                  )}
                </div>
                <Link
                  href={`/issues/${issueId}/review/${draft.id}`}
                  className="mt-1 block font-medium text-white hover:underline"
                >
                  {draft.title_ar || "بدون عنوان"}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                  {draft.summary_ar}
                </p>
                <span className="text-xs text-zinc-600">
                  {draftStatusLabels[draft.status]}
                </span>
              </div>
            </li>
          );
        })}
        {suggested.length === 0 && (
          <p className="py-8 text-center text-zinc-500">لا توجد مسودات للمراجعة</p>
        )}
      </ul>
    </div>
  );
}
