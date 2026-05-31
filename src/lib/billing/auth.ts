import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export type BillingAuthResult =
  | { user: User; token: string; error: null }
  | { user: null; token: null; error: "missing_token" | "invalid_token" | "server_config" };

export function billingCorsHeaders(): HeadersInit {
  const origin = process.env.MOBILE_CORS_ORIGIN ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function billingJsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: billingCorsHeaders() });
}

export async function verifyBillingBearer(
  request: NextRequest
): Promise<BillingAuthResult> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { user: null, token: null, error: "missing_token" };
  }

  const token = auth.slice(7).trim();
  if (!token) return { user: null, token: null, error: "missing_token" };

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    return { user: null, token: null, error: "server_config" };
  }

  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, token: null, error: "invalid_token" };
  }

  return { user: data.user, token, error: null };
}

export async function getActiveSubscription(
  supabase: SupabaseClient,
  userId: string
) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("user_subscriptions")
    .select(
      "id, plan_id, status, starts_at, expires_at, is_lifetime, plan:subscription_plans(name_ar, name_en, duration_days, is_lifetime)"
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .or(`is_lifetime.eq.true,expires_at.gt.${now}`)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}
