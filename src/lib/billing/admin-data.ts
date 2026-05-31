import type { SupabaseClient } from "@supabase/supabase-js";
import { listAppAuthUsers } from "@/lib/users/app-users";
import { formatSubscriptionStatus } from "@/lib/billing/plan-utils";

export type EnrolledSubscriptionRow = {
  id: string;
  user_id: string;
  user_email: string;
  user_display_name: string | null;
  plan_id: string;
  plan_name_ar: string;
  status: string;
  is_lifetime: boolean;
  starts_at: string;
  expires_at: string;
  created_at: string;
  status_label: string;
};

export async function buildUserEmailMap(
  service: SupabaseClient
): Promise<Map<string, { email: string; display_name: string | null }>> {
  const users = await listAppAuthUsers(service);
  const map = new Map<string, { email: string; display_name: string | null }>();
  for (const u of users) {
    map.set(u.id, {
      email: u.email ?? "",
      display_name: (u.user_metadata?.display_name as string) ?? null,
    });
  }
  return map;
}

export async function fetchEnrolledSubscriptions(
  service: SupabaseClient,
  limit = 300
): Promise<EnrolledSubscriptionRow[]> {
  const [{ data: subs, error }, emailMap] = await Promise.all([
    service
      .from("user_subscriptions")
      .select(
        "id, user_id, plan_id, status, is_lifetime, starts_at, expires_at, created_at, plan:subscription_plans(name_ar)"
      )
      .order("created_at", { ascending: false })
      .limit(limit),
    buildUserEmailMap(service),
  ]);

  if (error) throw new Error(error.message);

  return (subs ?? []).map((s) => {
    const plan = s.plan as unknown as { name_ar: string } | null;
    const user = emailMap.get(s.user_id);
    const isLifetime = Boolean(s.is_lifetime);
    return {
      id: s.id,
      user_id: s.user_id,
      user_email: user?.email ?? "—",
      user_display_name: user?.display_name ?? null,
      plan_id: s.plan_id,
      plan_name_ar: plan?.name_ar ?? "—",
      status: s.status,
      is_lifetime: isLifetime,
      starts_at: s.starts_at,
      expires_at: s.expires_at,
      created_at: s.created_at,
      status_label: formatSubscriptionStatus(
        isLifetime,
        s.expires_at,
        s.status
      ),
    };
  });
}

export function countActiveSubscriptions(
  rows: { status: string; is_lifetime: boolean; expires_at: string }[]
): number {
  const now = Date.now();
  return rows.filter(
    (s) =>
      s.status === "active" &&
      (s.is_lifetime || new Date(s.expires_at).getTime() > now)
  ).length;
}

export async function fetchSubscriptionMetaByUser(
  service: SupabaseClient
): Promise<
  Map<
    string,
    {
      active: boolean;
      is_lifetime: boolean;
      expires_at: string | null;
      plan_name_ar: string | null;
      status_label: string;
    }
  >
> {
  const { data, error } = await service
    .from("user_subscriptions")
    .select(
      "user_id, status, is_lifetime, expires_at, plan:subscription_plans(name_ar)"
    )
    .eq("status", "active")
    .order("expires_at", { ascending: false });

  if (error) throw new Error(error.message);

  const map = new Map<
    string,
    {
      active: boolean;
      is_lifetime: boolean;
      expires_at: string | null;
      plan_name_ar: string | null;
      status_label: string;
    }
  >();

  const now = Date.now();
  for (const row of data ?? []) {
    if (map.has(row.user_id)) continue;
    const isLifetime = Boolean(row.is_lifetime);
    const active =
      isLifetime || new Date(row.expires_at).getTime() > now;
    if (!active) continue;
    const plan = row.plan as unknown as { name_ar: string } | null;
    map.set(row.user_id, {
      active: true,
      is_lifetime: isLifetime,
      expires_at: row.expires_at,
      plan_name_ar: plan?.name_ar ?? null,
      status_label: formatSubscriptionStatus(
        isLifetime,
        row.expires_at,
        row.status
      ),
    });
  }

  return map;
}
