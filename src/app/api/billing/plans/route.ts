import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { billingCorsHeaders, billingJsonResponse } from "@/lib/billing/auth";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: billingCorsHeaders() });
}

export async function GET(_request: NextRequest) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .select(
      "id, name_ar, name_en, description_ar, price_kwd, duration_days, is_lifetime, sort_order, features"
    )
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at");

  if (error) {
    if (error.message.includes("does not exist")) {
      return billingJsonResponse(
        { error: "Billing tables not migrated. Run 012_billing.sql." },
        503
      );
    }
    return billingJsonResponse({ error: error.message }, 500);
  }

  return billingJsonResponse({ plans: data ?? [] });
}
