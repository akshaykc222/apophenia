"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { slugify } from "@/lib/utils";
import {
  isStaleReference,
  STALE_REFERENCE_DAYS,
} from "@/lib/reference/stale";

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox";
};

type RefTable = "categories" | "ministries" | "tender_categories";

function sourceBadge(source: string | undefined) {
  switch (source) {
    case "canonical":
      return { label: "تبويب التطبيق", variant: "warning" as const };
    case "manual":
      return { label: "يدوي", variant: "default" as const };
    case "pdf":
    default:
      return { label: "من PDF", variant: "success" as const };
  }
}

export function ReferenceTable({
  table,
  title,
  fields,
  rows,
  slugFrom,
  supportsStaleFilter = false,
}: {
  table: RefTable;
  title: string;
  fields: Field[];
  rows: Record<string, unknown>[];
  slugFrom?: string;
  /** Ministries / tender categories: hide & bulk-delete stale rows */
  supportsStaleFilter?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideStale, setHideStale] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pruneConfirm, setPruneConfirm] = useState(false);
  const [pruneLoading, setPruneLoading] = useState(false);

  const visibleRows = useMemo(() => {
    if (!supportsStaleFilter || !hideStale) return rows;
    return rows.filter(
      (row) => !isStaleReference(row.last_seen_at as string | null | undefined)
    );
  }, [rows, hideStale, supportsStaleFilter]);

  const staleCount = useMemo(() => {
    if (!supportsStaleFilter) return 0;
    return rows.filter((row) =>
      isStaleReference(row.last_seen_at as string | null | undefined)
    ).length;
  }, [rows, supportsStaleFilter]);

  function setField(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildSlug(row: Record<string, unknown>): string {
    const fromField = slugFrom && form[slugFrom]
      ? String(form[slugFrom])
      : slugFrom && row[slugFrom]
        ? String(row[slugFrom])
        : null;
    const fromArabic = String(form.name_ar ?? row.name_ar ?? "");
    const base = fromField || fromArabic;
    const slug = slugify(base);
    return slug.length > 1 ? slug : `ref-${Date.now().toString(36)}`;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, unknown> = { ...form };

    payload.slug = buildSlug(form);

    for (const f of fields) {
      if (f.type === "number" && payload[f.key] !== undefined) {
        payload[f.key] = Number(payload[f.key]);
      }
    }

    if (table === "categories") {
      payload.source = "manual";
    } else {
      payload.source = "manual";
      payload.last_seen_at = new Date().toISOString();
    }

    const { error: insertError } = await supabase.from(table).insert(payload);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({});
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setError(null);

    const res = await fetch(`/api/reference/${table}/${deleteTarget.id}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));

    setDeleteLoading(false);
    setDeleteTarget(null);

    if (!res.ok) {
      setError(data.error ?? "فشل الحذف");
      return;
    }

    router.refresh();
  }

  async function confirmPruneStale() {
    if (table === "categories") return;
    setPruneLoading(true);
    setError(null);

    const res = await fetch("/api/reference/prune-stale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, days: STALE_REFERENCE_DAYS }),
    });
    const data = await res.json().catch(() => ({}));

    setPruneLoading(false);
    setPruneConfirm(false);

    if (!res.ok) {
      setError(data.error ?? "فشل تنظيف البيانات القديمة");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {supportsStaleFilter && staleCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={hideStale}
                onChange={(e) => setHideStale(e.target.checked)}
              />
              إخفاء غير المستخدمة في آخر {STALE_REFERENCE_DAYS} يوماً ({staleCount})
            </label>
            <Button
              type="button"
              variant="outline"
              className="border-red-900 text-red-300 hover:bg-red-950"
              onClick={() => setPruneConfirm(true)}
            >
              حذف القديمة ({staleCount})
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
      )}

      <form onSubmit={handleAdd} className="rounded-xl border border-zinc-800 p-6">
        <h2 className="mb-4 font-medium">إضافة جديد</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label>{f.label}</Label>
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={!!form[f.key]}
                  onChange={(e) => setField(f.key, e.target.checked)}
                />
              ) : (
                <Input
                  type={f.type === "number" ? "number" : "text"}
                  value={String(form[f.key] ?? "")}
                  onChange={(e) => setField(f.key, e.target.value)}
                  dir="rtl"
                />
              )}
            </div>
          ))}
        </div>
        <Button type="submit" className="mt-4" disabled={loading}>
          إضافة
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950 text-zinc-400">
            <tr>
              {fields.map((f) => (
                <th key={f.key} className="px-4 py-3 text-right">
                  {f.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right">المصدر</th>
              {supportsStaleFilter && (
                <th className="px-4 py-3 text-right">آخر ظهور</th>
              )}
              <th className="px-4 py-3 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const stale = supportsStaleFilter
                ? isStaleReference(
                    row.last_seen_at as string | null | undefined
                  )
                : false;
              const badge = sourceBadge(String(row.source ?? "pdf"));
              return (
                <tr
                  key={String(row.id)}
                  className={`border-t border-zinc-800 ${stale ? "opacity-50" : ""}`}
                >
                  {fields.map((f) => (
                    <td key={f.key} className="px-4 py-3">
                      {f.type === "checkbox"
                        ? row[f.key]
                          ? "نعم"
                          : "لا"
                        : String(row[f.key] ?? "—")}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </td>
                  {supportsStaleFilter && (
                    <td className="px-4 py-3 text-zinc-500">
                      {row.last_seen_at
                        ? new Date(String(row.last_seen_at)).toLocaleDateString(
                            "ar-KW"
                          )
                        : "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          id: String(row.id),
                          label: String(row.name_ar ?? row.id),
                        })
                      }
                      className="text-red-400 hover:underline"
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + (supportsStaleFilter ? 3 : 2)}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  {hideStale && staleCount > 0
                    ? "لا صفوف نشطة — أزل «إخفاء غير المستخدمة» أو احذف القديمة"
                    : "لا توجد بيانات — ستُنشأ تلقائياً من PDF أو أضف يدوياً"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="تأكيد الحذف"
        description={
          deleteTarget
            ? `هل تريد حذف «${deleteTarget.label}»؟ سيتم إزالة الربط من المحتوى المنشور المرتبط.`
            : ""
        }
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={pruneConfirm}
        title="حذف الجهات غير المستخدمة"
        description={`سيتم حذف ${staleCount} عنصراً لم يُذكر في PDF خلال آخر ${STALE_REFERENCE_DAYS} يوماً (أو لم يُحدَّث بعد تفعيل الميزة).`}
        confirmLabel="حذف الكل"
        cancelLabel="إلغاء"
        variant="destructive"
        loading={pruneLoading}
        onConfirm={confirmPruneStale}
        onCancel={() => setPruneConfirm(false)}
      />
    </div>
  );
}
