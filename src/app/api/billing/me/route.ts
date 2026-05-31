import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  billingCorsHeaders,
  billingJsonResponse,
  getActiveSubscription,
  verifyBillingBearer,
} from "@/lib/billing/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: billingCorsHeaders() });
}

export async function GET(request: NextRequest) {
  const auth = await verifyBillingBearer(request);
  if (auth.error === "missing_token" || auth.error === "invalid_token") {
    return billingJsonResponse({ error: "Unauthorized" }, 401);
  }
  if (auth.error === "server_config") {
    return billingJsonResponse({ error: "Server misconfigured" }, 500);
  }

  const service = createServiceClient();
  const sub = await getActiveSubscription(service, auth.user!.id);

  if (!sub) {
    return billingJsonResponse({
      active: false,
      subscription: null,
      days_remaining: 0,
    });
  }

  const isLifetime = Boolean(
    (sub as { is_lifetime?: boolean }).is_lifetime
  );
  let daysRemaining: number | null = null;
  if (!isLifetime) {
    const expiresAt = new Date(sub.expires_at);
    daysRemaining = Math.max(
      0,
      Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  }

  return billingJsonResponse({
    active: true,
    is_lifetime: isLifetime,
    subscription: {
      id: sub.id,
      plan_id: sub.plan_id,
      starts_at: sub.starts_at,
      expires_at: sub.expires_at,
      is_lifetime: isLifetime,
      plan: sub.plan,
    },
    days_remaining: daysRemaining,
  });
}
