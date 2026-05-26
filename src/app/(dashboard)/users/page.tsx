import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAppUsersData, ACTIVE_USER_DAYS } from "@/lib/users/app-users";
import { UsersTable } from "@/components/users/users-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Users, Activity, Smartphone } from "lucide-react";

export default async function AppUsersPage() {
  const service = createServiceClient();
  let users: Awaited<ReturnType<typeof fetchAppUsersData>>["users"] = [];
  let analytics: Awaited<ReturnType<typeof fetchAppUsersData>>["analytics"] = {
    total_onboarded: 0,
    active_users: 0,
    new_this_week: 0,
    with_device: 0,
  };
  let loadError: string | null = null;

  try {
    const data = await fetchAppUsersData(service);
    users = data.users;
    analytics = data.analytics;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "فشل تحميل المستخدمين";
  }

  const statCards = [
    {
      label: "إجمالي المسجّلين",
      value: analytics.total_onboarded,
      icon: Users,
    },
    {
      label: `نشطون (${ACTIVE_USER_DAYS} يوم)`,
      value: analytics.active_users,
      icon: Activity,
    },
    {
      label: "انضموا هذا الأسبوع",
      value: analytics.new_this_week,
      icon: UserPlus,
    },
    {
      label: "أجهزة FCM مسجّلة",
      value: analytics.with_device,
      icon: Smartphone,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مستخدمون التطبيق</h1>
          <p className="mt-1 text-sm text-zinc-500">
            حسابات التطبيق (بدون مسؤولي اللوحة) — التسجيل والنشاط.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-white"
        >
          ← لوحة التحكم
        </Link>
      </div>

      {loadError && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {loadError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
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

      <UsersTable users={users} />
    </div>
  );
}
