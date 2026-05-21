"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { slugify } from "@/lib/utils";

type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "checkbox";
};

const SEED_SLUGS: Record<string, string[]> = {
  categories: ["ministries", "addendums", "decrees"],
  ministries: ["interior", "finance", "public-works", "cabinet"],
  tender_categories: ["services", "consultancy", "construction", "supply"],
};

export function ReferenceTable({
  table,
  title,
  fields,
  rows,
  slugFrom,
}: {
  table: "categories" | "ministries" | "tender_categories";
  title: string;
  fields: Field[];
  rows: Record<string, unknown>[];
  slugFrom?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const seedSlugs = SEED_SLUGS[table] ?? [];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{title}</h1>

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
              <th className="px-4 py-3 text-right">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const slug = String(row.slug ?? "");
              const isSeed = seedSlugs.includes(slug);
              return (
                <tr key={String(row.id)} className="border-t border-zinc-800">
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
                    <Badge variant={isSeed ? "warning" : "success"}>
                      {isSeed ? "افتراضي" : "من PDF"}
                    </Badge>
                  </td>
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
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={fields.length + 2}
                  className="px-4 py-8 text-center text-zinc-500"
                >
                  لا توجد بيانات — ستُنشأ تلقائياً من PDF أو أضف يدوياً
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
    </div>
  );
}
