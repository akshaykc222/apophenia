import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAdminUser(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

export async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, isAdmin: false };
  }

  const isAdmin = await isAdminUser(supabase, user.id);
  return { user, isAdmin };
}
