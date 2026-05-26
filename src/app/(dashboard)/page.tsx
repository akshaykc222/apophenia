import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Newspaper,
  Clock,
  AlertCircle,
  Users,
  Activity,
  UserPlus,
  Smartphone,
} from "lucide-react";
import { fetchAppUsersData, ACTIVE_USER_DAYS } from "@/lib/users/app-users";
import {
  UploadIssueLink,
  UploadBlockedHint,
} from "@/components/issues/upload-issue-link";
import { APP_NAME } from "@/lib/brand";

export default async function DashboardPage() {
  const supabase = await createClient();

  const service = createServiceClient();

  const [
    { count: issuesProcessing },
    { count: draftsPending },
    { count: publishedWeek },
    { data: lastFailed },
    userData,
  ] = await Promise.all([
    supabase
      .from("pdf_issues")
      .select("*", { count: "exact", head: true })
      .in("extraction_status", ["pending", "processing"]),
    supabase
      .from("content_drafts")
      .select("*", { count: "exact", head: true })
      .eq("status", "suggested"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
      .gte(
        "published_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      ),
    supabase
      .from("pdf_issues")
      .select("id, original_filename, error_message, updated_at")
      .eq("extraction_status", "failed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchAppUsersData(service).catch(() => ({
      users: [],
      analytics: {
        total_onboarded: 0,
        active_users: 0,
        new_this_week: 0,
        with_device: 0,
      },
    })),
  ]);

  const { analytics: userAnalytics } = userData;

  const stats = [
    {
      label: "إصدارات قيد المعالجة",
      value: issuesProcessing ?? 0,
      icon: Clock,
    },
    {
      label: "مسودات يدوية (إن وُجدت)",
      value: draftsPending ?? 0,
      icon: FileText,
    },
    {
      label: "منشور هذا الأسبوع",
      value: publishedWeek ?? 0,
      icon: Newspaper,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-zinc-500">إدارة إصدارات الجريدة والمحتوى — {APP_NAME}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
        <div className="flex gap-3">
          <UploadIssueLink className="inline-flex h-10 items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black hover:bg-zinc-200">
            رفع إصدار جديد
          </UploadIssueLink>
          <Link
            href="/issues"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700"
          >
            مراجعة الإصدارات
          </Link>
        </div>
        <UploadBlockedHint />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {s.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">مستخدمو التطبيق</h2>
          <Link
            href="/users"
            className="text-sm text-zinc-400 hover:text-white"
          >
            عرض الكل ←
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "مسجّلون",
              value: userAnalytics.total_onboarded,
              icon: Users,
            },
            {
              label: `نشطون (${ACTIVE_USER_DAYS} يوم)`,
              value: userAnalytics.active_users,
              icon: Activity,
            },
            {
              label: "جدد هذا الأسبوع",
              value: userAnalytics.new_this_week,
              icon: UserPlus,
            },
            {
              label: "أجهزة مسجّلة",
              value: userAnalytics.with_device,
              icon: Smartphone,
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {s.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {lastFailed && (
        <Card className="border-red-900/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <CardTitle className="text-red-300">آخر استخراج فاشل</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            <p>{lastFailed.original_filename}</p>
            <p className="mt-1">{lastFailed.error_message}</p>
            <Link
              href={`/issues/${lastFailed.id}`}
              className="mt-3 inline-flex h-9 items-center rounded-lg border border-zinc-700 px-4 text-sm hover:bg-zinc-900"
            >
              عرض التفاصيل
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
