"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SubscriptionPlan } from "@/lib/billing/types";
import { formatPlanDuration } from "@/lib/billing/plan-utils";

type Props = {
  initialPlans: SubscriptionPlan[];
};

export function SubscriptionPlansManager({ initialPlans }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [price, setPrice] = useState("");
  const [durationMode, setDurationMode] = useState<
    "30" | "90" | "365" | "custom" | "lifetime"
  >("90");
  const [customDays, setCustomDays] = useState("90");
  const [sortOrder, setSortOrder] = useState("0");

  function resolveDurationPayload(): {
    is_lifetime: boolean;
    duration_days?: number;
  } {
    if (durationMode === "lifetime") {
      return { is_lifetime: true };
    }
    const days =
      durationMode === "custom"
        ? Number(customDays)
        : Number(durationMode);
    return { is_lifetime: false, duration_days: days };
  }

  const refresh = useCallback(() => router.refresh(), [router]);

  useEffect(() => {
    setPlans(initialPlans);
  }, [initialPlans]);

  async function addPlan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/billing/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_ar: nameAr,
          name_en: nameEn || null,
          description_ar: descriptionAr || null,
          price_kwd: Number(price),
          sort_order: Number(sortOrder),
          ...resolveDurationPayload(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "فشل الإضافة");
        return;
      }
      setPlans((prev) => [...prev, data.plan].sort((a, b) => a.sort_order - b.sort_order));
      setNameAr("");
      setNameEn("");
      setDescriptionAr("");
      setPrice("");
      setDurationMode("90");
      setCustomDays("90");
      setSortOrder("0");
      setSuccess("تمت إضافة الخطة.");
      refresh();
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(plan: SubscriptionPlan) {
    setError(null);
    const res = await fetch(`/api/billing/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "فشل التحديث");
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? data.plan : p)));
    refresh();
  }

  async function deactivatePlan(id: string) {
    setError(null);
    const res = await fetch(`/api/billing/admin/plans/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "فشل التعطيل");
      return;
    }
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: false } : p))
    );
    setDeactivateId(null);
    setSuccess("تم تعطيل الخطة.");
    refresh();
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

      <Card>
        <CardHeader>
          <CardTitle>إضافة خطة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addPlan} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name_ar">الاسم (عربي)</Label>
                <Input
                  id="name_ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name_en">الاسم (English)</Label>
                <Input
                  id="name_en"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description_ar">الوصف</Label>
              <Textarea
                id="description_ar"
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="price">السعر (د.ك)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sort">الترتيب</Label>
                <Input
                  id="sort"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="duration_mode">مدة الاشتراك</Label>
              <select
                id="duration_mode"
                value={durationMode}
                onChange={(e) =>
                  setDurationMode(
                    e.target.value as typeof durationMode
                  )
                }
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option value="30">30 يوماً (شهر)</option>
                <option value="90">90 يوماً (3 أشهر)</option>
                <option value="365">365 يوماً (سنة)</option>
                <option value="custom">مدة مخصّصة (أيام)</option>
                <option value="lifetime">مدى الحياة</option>
              </select>
            </div>
            {durationMode === "custom" && (
              <div>
                <Label htmlFor="custom_days">عدد الأيام</Label>
                <Input
                  id="custom_days"
                  type="number"
                  min="1"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ…" : "إضافة الخطة"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>الخطط الحالية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 && (
            <p className="text-sm text-zinc-500">لا توجد خطط بعد.</p>
          )}
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 p-4"
            >
              <div>
                <p className="font-medium">{plan.name_ar}</p>
                <p className="text-sm text-zinc-500">
                  {plan.price_kwd} د.ك ·{" "}
                  {formatPlanDuration(
                    plan.is_lifetime ?? false,
                    plan.duration_days
                  )}
                  {!plan.is_active && " · معطّلة"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(plan)}
                >
                  {plan.is_active ? "تعطيل مؤقت" : "تفعيل"}
                </Button>
                {plan.is_active && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeactivateId(plan.id)}
                  >
                    أرشفة
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deactivateId !== null}
        title="تعطيل الخطة؟"
        description="لن تظهر للمستخدمين في التطبيق. الاشتراكات الحالية تبقى فعّالة حتى انتهاء مدتها."
        confirmLabel="تعطيل"
        onConfirm={() => deactivateId && deactivatePlan(deactivateId)}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  );
}
