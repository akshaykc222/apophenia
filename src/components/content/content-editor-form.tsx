"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { buildSearchText, slugify } from "@/lib/utils";
import type {
  Category,
  ContentType,
  Ministry,
  TenderCategory,
} from "@/lib/types/database";

interface ContentEditorFormProps {
  mode: "create" | "edit";
  itemId?: string;
  initial?: {
    content_type: ContentType;
    category_id: string | null;
    ministry_id: string | null;
    tender_category_id: string | null;
    title_ar: string;
    summary_ar: string | null;
    body_ar: string | null;
    tags: string[] | null;
    source_name: string | null;
    source_logo_url: string | null;
    is_featured: boolean;
    is_published: boolean;
    published_at: string | null;
    deadline_at: string | null;
    application_url: string | null;
  };
  categories: Category[];
  ministries: Ministry[];
  tenderCategories: TenderCategory[];
}

export function ContentEditorForm({
  mode,
  itemId,
  initial,
  categories,
  ministries,
  tenderCategories,
}: ContentEditorFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contentType, setContentType] = useState<ContentType>(
    initial?.content_type ?? "article"
  );
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [ministryId, setMinistryId] = useState(initial?.ministry_id ?? "");
  const [tenderCategoryId, setTenderCategoryId] = useState(
    initial?.tender_category_id ?? ""
  );
  const [title, setTitle] = useState(initial?.title_ar ?? "");
  const [summary, setSummary] = useState(initial?.summary_ar ?? "");
  const [body, setBody] = useState(initial?.body_ar ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [sourceName, setSourceName] = useState(initial?.source_name ?? "كويت اليوم");
  const [sourceLogo, setSourceLogo] = useState(initial?.source_logo_url ?? "");
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [publishedAt, setPublishedAt] = useState(
    initial?.published_at?.slice(0, 16) ?? new Date().toISOString().slice(0, 16)
  );
  const [deadlineAt, setDeadlineAt] = useState(
    initial?.deadline_at?.slice(0, 16) ?? ""
  );
  const [applicationUrl, setApplicationUrl] = useState(
    initial?.application_url ?? ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const ministry = ministries.find((m) => m.id === ministryId);
    const searchText = buildSearchText([
      title,
      summary,
      body,
      ministry?.name_ar,
      ...tagList,
    ]);

    const payload = {
      content_type: contentType,
      category_id: categoryId || null,
      ministry_id: ministryId || null,
      tender_category_id: tenderCategoryId || null,
      title_ar: title,
      summary_ar: summary || null,
      body_ar: body || null,
      search_text: searchText,
      tags: tagList,
      source_name: sourceName,
      source_logo_url: sourceLogo || null,
      is_featured: isFeatured,
      is_published: isPublished,
      published_at: isPublished ? new Date(publishedAt).toISOString() : null,
      deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
      application_url: applicationUrl || null,
    };

    if (mode === "create") {
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;
      const { error: err } = await supabase.from("content_items").insert({
        ...payload,
        slug,
      });
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    } else if (itemId) {
      const { error: err } = await supabase
        .from("content_items")
        .update(payload)
        .eq("id", itemId);
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
    }

    router.push("/content");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>نوع المحتوى</Label>
          <Select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
          >
            <option value="article">مقال / خبر</option>
            <option value="tender">مناقصة</option>
            <option value="decree">مرسوم / حكم</option>
            <option value="addendum">استدراك</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>التصنيف</Label>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— اختر —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>الجهة / الوزارة</Label>
          <Select value={ministryId} onChange={(e) => setMinistryId(e.target.value)}>
            <option value="">— اختر —</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name_ar}
              </option>
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
              <option value="">— اختر —</option>
              {tenderCategories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name_ar}
                </option>
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
        <Label>الملخص (بطاقة القائمة)</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          dir="rtl"
        />
      </div>

      <div className="space-y-2">
        <Label>المحتوى الكامل</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} dir="rtl" />
      </div>

      <div className="space-y-2">
        <Label>الوسوم (مفصولة بفاصلة)</Label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} dir="rtl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>اسم المصدر</Label>
          <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} dir="rtl" />
        </div>
        <div className="space-y-2">
          <Label>رابط شعار المصدر</Label>
          <Input value={sourceLogo} onChange={(e) => setSourceLogo(e.target.value)} dir="ltr" />
        </div>
      </div>

      {contentType === "tender" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>الموعد النهائي</Label>
            <Input
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>رابط تقديم الطلب</Label>
            <Input
              type="url"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              dir="ltr"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="rounded"
          />
          مميز (بطاقة رئيسية)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="rounded"
          />
          منشور
        </label>
      </div>

      {isPublished && (
        <div className="space-y-2">
          <Label>تاريخ النشر</Label>
          <Input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "جاري الحفظ..." : mode === "create" ? "إنشاء" : "حفظ التغييرات"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
