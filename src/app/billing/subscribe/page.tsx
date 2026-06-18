"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";
import {
  PUBLIC_APP_NAME_AR,
  PUBLIC_APP_NAME_EN,
} from "@/lib/legal/public-app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
  id: string;
  name_ar: string;
  price_kwd: number;
  duration_days: number | null;
  description_ar: string | null;
};

export default function BillingSubscribePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const supabase = createClient();

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/billing/plans");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load plans");
      setPlans(data.plans ?? []);
    } catch (e) {
      setCheckoutError(
        e instanceof Error ? e.message : "تعذر تحميل خطط الاشتراك"
      );
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    void supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, [loadPlans, supabase.auth]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(mapAuthError(error.message));
    }
    setLoadingAuth(false);
  }

  async function handleCheckout(planId: string) {
    if (!accessToken) {
      setCheckoutError("سجّل الدخول أولاً بنفس حساب التطبيق.");
      return;
    }
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "تعذر بدء الدفع");
      }
      if (!data.paymentUrl) {
        throw new Error("لم يُرجع رابط الدفع");
      }
      window.location.href = data.paymentUrl as string;
    } catch (e) {
      setCheckoutError(
        e instanceof Error ? e.message : "تعذر بدء الدفع. حاول مرة أخرى."
      );
      setCheckingOut(null);
    }
  }

  const signedIn = accessToken != null;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-lg space-y-8">
        <header className="space-y-2 text-center">
          <p className="text-sm text-zinc-500">{PUBLIC_APP_NAME_EN}</p>
          <h1 className="text-2xl font-bold">اشتراك {PUBLIC_APP_NAME_AR}</h1>
          <p className="text-sm text-zinc-400">
            ادفع عبر MyFatoorah ثم ارجع إلى التطبيق وسجّل الدخول لاستخدام
            الميزات المميزة.
          </p>
        </header>

        {!signedIn ? (
          <form
            onSubmit={handleSignIn}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
          >
            <h2 className="text-lg font-semibold">تسجيل الدخول</h2>
            <p className="text-sm text-zinc-400">
              استخدم نفس البريد وكلمة المرور من تطبيق {PUBLIC_APP_NAME_AR}.
            </p>
            {authError && (
              <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
                {authError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-zinc-700 bg-zinc-900"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loadingAuth}>
              {loadingAuth ? "جاري الدخول…" : "تسجيل الدخول"}
            </Button>
          </form>
        ) : (
          <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4 text-center text-sm text-emerald-300">
            تم تسجيل الدخول. اختر باقة للمتابعة إلى الدفع.
          </p>
        )}

        {checkoutError && (
          <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
            {checkoutError}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">الباقات</h2>
          {loadingPlans ? (
            <p className="text-zinc-500">جاري التحميل…</p>
          ) : plans.length === 0 ? (
            <p className="text-zinc-500">لا توجد باقات متاحة حالياً.</p>
          ) : (
            <ul className="space-y-3">
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{plan.name_ar}</h3>
                      {plan.description_ar && (
                        <p className="mt-1 text-sm text-zinc-400">
                          {plan.description_ar}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-lg font-bold">
                      {Number(plan.price_kwd).toFixed(3)} د.ك
                    </p>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    disabled={!signedIn || checkingOut != null}
                    onClick={() => void handleCheckout(plan.id)}
                  >
                    {checkingOut === plan.id ? "جاري التحويل…" : "الدفع الآن"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="flex flex-col gap-2 text-center text-sm text-zinc-500">
          <Link href="/privacy" className="underline hover:text-zinc-300">
            سياسة الخصوصية
          </Link>
          <Link href="/terms" className="underline hover:text-zinc-300">
            شروط الاستخدام
          </Link>
        </footer>
      </div>
    </main>
  );
}
