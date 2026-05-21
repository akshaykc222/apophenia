"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mapAuthError } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@alfaresi.com");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("Admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function clientBootstrap() {
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });

    if (signUpError) {
      throw new Error(mapAuthError(signUpError.message));
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      throw new Error("تحقق من بريدك لتأكيد الحساب، ثم سجّل الدخول.");
    }

    const { error: adminError } = await supabase.from("admin_users").insert({
      user_id: userId,
      display_name: displayName,
    });

    if (adminError) {
      if (adminError.code === "42501") {
        throw new Error(
          "نفّذ supabase/migrations/003_admin_bootstrap_rls.sql في Supabase SQL Editor."
        );
      }
      throw new Error(mapAuthError(adminError.message));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/setup/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message ?? "تم إنشاء المسؤول.");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      if (res.status === 503) {
        await clientBootstrap();
        setSuccess("تم إنشاء المسؤول. جاري التحويل لتسجيل الدخول...");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      setError(mapAuthError(data.error ?? "فشل الإعداد"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الإعداد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>إعداد أول مسؤول</CardTitle>
          <CardDescription>
            أنشئ حساب المسؤول الأول (مرة واحدة) — مثال: admin@alfaresi.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-900/30 p-3 text-sm text-emerald-300">
                {success}
              </p>
            )}

            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء مسؤول"}
            </Button>

            <p className="text-xs text-zinc-500">
              مع <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> يُؤكَّد البريد تلقائياً.
              بدونها يُستخدم التسجيل العادي + سياسة أول مسؤول (migration 003).
            </p>

            <p className="text-center text-sm">
              <Link href="/login" className="text-zinc-400 hover:text-white">
                لديك حساب؟ تسجيل الدخول
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
