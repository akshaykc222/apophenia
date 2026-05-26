"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { AppHelpItem, AppHelpPage } from "@/lib/help/types";

type HelpManagerProps = {
  initialPage: AppHelpPage;
  initialItems: AppHelpItem[];
};

export function HelpManager({ initialPage, initialItems }: HelpManagerProps) {
  const router = useRouter();
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState(initialItems);
  const [pageLoading, setPageLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newSort, setNewSort] = useState("0");
  const [newPublished, setNewPublished] = useState(true);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  useEffect(() => {
    setPage(initialPage);
    setItems(initialItems);
  }, [initialPage, initialItems]);

  async function savePage(e: React.FormEvent) {
    e.preventDefault();
    setPageLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/help/page", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_ar: page.title_ar,
          intro_ar: page.intro_ar,
          contact_email: page.contact_email,
          contact_phone: page.contact_phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الحفظ");
        return;
      }
      setPage(data.page);
      setSuccess("تم حفظ صفحة المساعدة.");
      refresh();
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setPageLoading(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setItemLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/help/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_ar: newTitle,
          body_ar: newBody,
          sort_order: Number(newSort),
          is_published: newPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الإضافة");
        return;
      }
      setItems((prev) => [...prev, data.item].sort((a, b) => a.sort_order - b.sort_order));
      setNewTitle("");
      setNewBody("");
      setNewSort("0");
      setNewPublished(true);
      setSuccess("تمت إضافة السؤال.");
      refresh();
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setItemLoading(false);
    }
  }

  async function updateItem(id: string, patch: Partial<AppHelpItem>) {
    setError(null);
    const res = await fetch(`/api/help/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "فشل التحديث");
      return;
    }
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? data.item : i))
        .sort((a, b) => a.sort_order - b.sort_order)
    );
    refresh();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setItemLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/help/items/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الحذف");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteId));
      setSuccess("تم الحذف.");
      refresh();
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setItemLoading(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
          {success}
        </p>
      )}

      <form onSubmit={savePage}>
        <Card>
          <CardHeader>
            <CardTitle>صفحة المساعدة في التطبيق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="help-title">عنوان الصفحة</Label>
              <Input
                id="help-title"
                value={page.title_ar}
                onChange={(e) => setPage({ ...page, title_ar: e.target.value })}
                required
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-intro">مقدمة (اختياري)</Label>
              <Textarea
                id="help-intro"
                value={page.intro_ar ?? ""}
                onChange={(e) =>
                  setPage({ ...page, intro_ar: e.target.value || null })
                }
                rows={3}
                dir="rtl"
                placeholder="نص ترحيبي يظهر أعلى قائمة الأسئلة في التطبيق"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="help-email">البريد للتواصل</Label>
                <Input
                  id="help-email"
                  type="email"
                  value={page.contact_email ?? ""}
                  onChange={(e) =>
                    setPage({ ...page, contact_email: e.target.value || null })
                  }
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-phone">الهاتف للتواصل</Label>
                <Input
                  id="help-phone"
                  value={page.contact_phone ?? ""}
                  onChange={(e) =>
                    setPage({ ...page, contact_phone: e.target.value || null })
                  }
                  dir="ltr"
                />
              </div>
            </div>
            <Button type="submit" disabled={pageLoading}>
              {pageLoading ? "جاري الحفظ..." : "حفظ الصفحة"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>أسئلة شائعة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={addItem} className="space-y-4 rounded-lg border border-zinc-800 p-4">
            <p className="text-sm font-medium text-zinc-300">إضافة سؤال جديد</p>
            <div className="space-y-2">
              <Label htmlFor="new-help-title">السؤال / العنوان</Label>
              <Input
                id="new-help-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-help-body">الإجابة</Label>
              <Textarea
                id="new-help-body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                required
                rows={4}
                dir="rtl"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-help-sort">الترتيب</Label>
                <Input
                  id="new-help-sort"
                  type="number"
                  value={newSort}
                  onChange={(e) => setNewSort(e.target.value)}
                  className="w-24"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={newPublished}
                  onChange={(e) => setNewPublished(e.target.checked)}
                />
                منشور في التطبيق
              </label>
            </div>
            <Button type="submit" disabled={itemLoading}>
              إضافة
            </Button>
          </form>

          <div className="space-y-4">
            {items.length === 0 && (
              <p className="text-sm text-zinc-500">لا أسئلة بعد — أضف أول سؤال أعلاه.</p>
            )}
            {items.map((item) => (
              <HelpItemEditor
                key={item.id}
                item={item}
                onSave={(patch) => updateItem(item.id, patch)}
                onDelete={() => setDeleteId(item.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteId !== null}
        title="حذف السؤال؟"
        description="سيختفي من التطبيق فور الحذف."
        confirmLabel="حذف"
        loading={itemLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function HelpItemEditor({
  item,
  onSave,
  onDelete,
}: {
  item: AppHelpItem;
  onSave: (patch: Partial<AppHelpItem>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title_ar);
  const [body, setBody] = useState(item.body_ar);
  const [sortOrder, setSortOrder] = useState(String(item.sort_order));
  const [published, setPublished] = useState(item.is_published);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(item.title_ar);
    setBody(item.body_ar);
    setSortOrder(String(item.sort_order));
    setPublished(item.is_published);
  }, [item]);

  async function handleSave() {
    setSaving(true);
    await onSave({
      title_ar: title,
      body_ar: body,
      sort_order: Number(sortOrder),
      is_published: published,
    });
    setSaving(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} dir="rtl" />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} dir="rtl" />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-zinc-500">ترتيب</Label>
          <Input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-20"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          منشور
        </label>
        <div className="ms-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onDelete}>
            حذف
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "..." : "حفظ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
