import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fetchSubscriptionMetaByUser } from "@/lib/billing/admin-data";

/** User considered active if signed in or refreshed FCM token within this window. */
export const ACTIVE_USER_DAYS = 30;

export type AppUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  has_device_token: boolean;
  device_updated_at: string | null;
  is_active: boolean;
  subscription_active: boolean;
  subscription_label: string;
  subscription_plan_name: string | null;
};

export type AppUserAnalytics = {
  total_onboarded: number;
  active_users: number;
  new_this_week: number;
  with_device: number;
};

function msDays(days: number) {
  return days * 24 * 60 * 60 * 1000;
}

export async function getAdminUserIds(
  service: SupabaseClient
): Promise<Set<string>> {
  const { data } = await service.from("admin_users").select("user_id");
  return new Set((data ?? []).map((r) => r.user_id));
}

export async function listAppAuthUsers(service: SupabaseClient): Promise<User[]> {
  const adminIds = await getAdminUserIds(service);
  const users: User[] = [];
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const batch = (data.users ?? []).filter((u) => !adminIds.has(u.id));
    users.push(...batch);

    if ((data.users?.length ?? 0) < perPage) break;
    page += 1;
  }

  return users;
}

async function getDeviceTokenMeta(
  service: SupabaseClient
): Promise<Map<string, { hasToken: boolean; lastUpdated: string | null }>> {
  const { data } = await service
    .from("device_tokens")
    .select("user_id, updated_at");

  const map = new Map<string, { hasToken: boolean; lastUpdated: string | null }>();

  for (const row of data ?? []) {
    const prev = map.get(row.user_id);
    if (!prev) {
      map.set(row.user_id, {
        hasToken: true,
        lastUpdated: row.updated_at as string,
      });
      continue;
    }
    const updated = row.updated_at as string;
    if (!prev.lastUpdated || updated > prev.lastUpdated) {
      map.set(row.user_id, { hasToken: true, lastUpdated: updated });
    }
  }

  return map;
}

export function isAppUserActive(
  lastSignInAt: string | null | undefined,
  deviceUpdatedAt: string | null | undefined,
  now = Date.now()
): boolean {
  const cutoff = now - msDays(ACTIVE_USER_DAYS);
  if (lastSignInAt && new Date(lastSignInAt).getTime() >= cutoff) return true;
  if (deviceUpdatedAt && new Date(deviceUpdatedAt).getTime() >= cutoff) return true;
  return false;
}

export function toAppUserRows(
  authUsers: User[],
  deviceMeta: Map<string, { hasToken: boolean; lastUpdated: string | null }>,
  subscriptionMeta: Map<
    string,
    { status_label: string; plan_name_ar: string | null; active: boolean }
  > = new Map()
): AppUserRow[] {
  const now = Date.now();

  return authUsers
    .map((u) => {
      const device = deviceMeta.get(u.id);
      const lastSignIn = u.last_sign_in_at ?? null;
      const deviceUpdated = device?.lastUpdated ?? null;

      const sub = subscriptionMeta.get(u.id);

      return {
        id: u.id,
        email: u.email ?? "",
        display_name: (u.user_metadata?.display_name as string) ?? null,
        created_at: u.created_at,
        last_sign_in_at: lastSignIn,
        has_device_token: device?.hasToken ?? false,
        device_updated_at: deviceUpdated,
        is_active: isAppUserActive(lastSignIn, deviceUpdated, now),
        subscription_active: sub?.active ?? false,
        subscription_label: sub?.status_label ?? "بدون اشتراك",
        subscription_plan_name: sub?.plan_name_ar ?? null,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export async function fetchAppUsersData(service: SupabaseClient): Promise<{
  users: AppUserRow[];
  analytics: AppUserAnalytics;
}> {
  const [authUsers, deviceMeta, subscriptionMeta] = await Promise.all([
    listAppAuthUsers(service),
    getDeviceTokenMeta(service),
    fetchSubscriptionMetaByUser(service).catch(() => new Map()),
  ]);

  const users = toAppUserRows(authUsers, deviceMeta, subscriptionMeta);
  const weekCutoff = Date.now() - msDays(7);

  const analytics: AppUserAnalytics = {
    total_onboarded: users.length,
    active_users: users.filter((u) => u.is_active).length,
    new_this_week: users.filter(
      (u) => new Date(u.created_at).getTime() >= weekCutoff
    ).length,
    with_device: users.filter((u) => u.has_device_token).length,
  };

  return { users, analytics };
}
