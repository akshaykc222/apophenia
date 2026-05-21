"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  ContentDraft,
  ContentType,
  Ministry,
  TenderCategory,
} from "@/lib/types/database";

interface DraftEditorFormProps {
  draft: ContentDraft;
  categories: Category[];
  ministries: Ministry[];
  tenderCategories: TenderCategory[];
}

export function DraftEditorForm({
  draft,
  categories,
  ministries,
  tenderCategories,
}: DraftEditorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<ContentType>(draft.content_type);
  const [categoryId, setCategoryId] = useState(draft.category_id ?? "");
  const [ministryId, setMinistryId] = useState(draft.ministry_id ?? "");
  const [tenderCategoryId, setTenderCategoryId] = useState(draft.tender_category_id ?? "");
  const [title, setTitle] = useState(draft.title_ar ?? "");
  const [summary, setSummary] = useState(draft.summary_ar ?? "");
  const [body, setBody] = useState(draft.body_ar ?? "");
  const [tags, setTags] = useState((draft.tags ?? []).join(", "));
  const [isFeatured, setIsFeatured] = useState(draft.is_featured);
  const [deadlineAt, setDeadlineAt] = useState(draft.deadline_at?.slice(0, 16) ?? "");
  const [applicationUrl, setApplicationUrl] = useState(draft.application_url ?? "");

  async function saveDraft() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const { error: err } = await supabase
      .from("content_drafts")
      .update({
        content_type: contentType,
        category_id: categoryId || null,
        ministry_id: ministryId || null,
        tender_category_id: tenderCategoryId || null,
        title_ar: title,
        summary_ar: summary,
        body_ar: body,
        tags: tagList,
        is_featured: isFeatured,
        deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
        application_url: applicationUrl || null,
        status: "accepted",
      })
      .eq("id", draft.id);

    setLoading(false);
    if (err) setError(err.message);
    else router.refresh();
  }

  async function publish() {
    await saveDraft();
    setLoading(true);
    const res = await fetch(`/api/drafts/${draft.id}/publish`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "فشل النشر");
      return;
    }
    router.push(`/issues/${draft.issue_id}/review`);
    router.refresh();
  }

  async function discard() {
    const supabase = createClient();
    await supabase
      .from("content_drafts")
      .update({ status: "rejected" })
      .eq("id", draft.id);
    router.push(`/issues/${draft.issue_id}/review`);
    router.refresh();
  }

  const confidence = draft.confidence_score ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {confidence > 0 && (
          <Badge variant={confidence >= 0.7 ? "success" : confidence >= 0.5 ? "warning" : "default"}>
            ثقة الاستخراج: {Math.round(confidence * 100)}%
          </Badge>
        )}
        {draft.page_start && (
          <Badge variant="info">
            صفحات {draft.page_start}–{draft.page_end}
          </Badge>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveDraft();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>نوع المحتوى</Label>
            <Select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
            >
              <option value="article">مقال</option>
              <option value="tender">مناقصة</option>
              <option value="decree">مرسوم</option>
              <option value="addendum">استدراك</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>التصنيف</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_ar}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الوزارة</Label>
            <Select value={ministryId} onChange={(e) => setMinistryId(e.target.value)}>
              <option value="">—</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>{m.name_ar}</option>
              ))}
            </Select>
          </div>
          {contentType === "tender" && (
            <div className="space-y-2">
              <Label>تصنيف المناقصة</Label>
              <Select
                value={tenderCategoryId}
                onChange={(e) => setTenderCategoryId(e.target.value)}
              >
                <option value="">—</option>
                {tenderCategories.map((t) => (
                  <option key={t.id} value={t.id}>{t.name_ar}</option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>العنوان</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>الملخص</Label>
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>المحتوى</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>الوسوم</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} dir="rtl" />
        </div>

        {contentType === "tender" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>الموعد النهائي</Label>
              <Input type="datetime-local" value={deadlineAt} onChange={(e) => setDeadlineAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>رابط التقديم</Label>
              <Input type="url" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} dir="ltr" />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          مميز
        </label>

        {draft.raw_extracted_text && (
          <details className="rounded-lg border border-zinc-800 p-4">
            <summary className="cursor-pointer text-sm text-zinc-400">النص المستخرج (للمراجعة)</summary>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-zinc-500">
              {draft.raw_extracted_text.slice(0, 3000)}
            </pre>
          </details>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" disabled={loading}>
            حفظ المسودة
          </Button>
          <Button type="button" onClick={publish} disabled={loading || !title}>
            نشر
          </Button>
          <Button type="button" variant="destructive" onClick={discard} disabled={loading}>
            رفض
          </Button>
        </div>
      </form>
    </div>
  );
}
