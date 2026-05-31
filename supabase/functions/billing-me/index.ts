import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sub } = await service
    .from("user_subscriptions")
    .select(
      "id, plan_id, status, starts_at, expires_at, plan:subscription_plans(name_ar, name_en, duration_days)"
    )
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub) {
    return new Response(
      JSON.stringify({ active: false, subscription: null, days_remaining: 0 }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const expiresAt = new Date(sub.expires_at);
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return new Response(
    JSON.stringify({
      active: true,
      subscription: {
        id: sub.id,
        plan_id: sub.plan_id,
        starts_at: sub.starts_at,
        expires_at: sub.expires_at,
        plan: sub.plan,
      },
      days_remaining: daysRemaining,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
