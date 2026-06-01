import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  billingCorsHeaders,
  billingJsonResponse,
  verifyBillingBearer,
} from "@/lib/billing/auth";
import { sendPayment } from "@/lib/myfatoorah/client";
import { getMyFatoorahConfig } from "@/lib/myfatoorah/config";
import {
  loadAuthUserProfile,
  resolveCustomerProfile,
} from "@/lib/billing/customer-profile";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: billingCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const auth = await verifyBillingBearer(request);
  if (auth.error === "missing_token" || auth.error === "invalid_token") {
    return billingJsonResponse({ error: "Unauthorized" }, 401);
  }
  if (auth.error === "server_config") {
    return billingJsonResponse({ error: "Server misconfigured" }, 500);
  }

  const mfConfig = getMyFatoorahConfig();
  if (!mfConfig.isConfigured) {
    return billingJsonResponse({ error: "Payment gateway not configured" }, 503);
  }

  let body: {
    plan_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_mobile?: string;
    native_sdk?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return billingJsonResponse({ error: "Invalid JSON" }, 400);
  }

  const planId = body.plan_id?.trim();
  if (!planId) {
    return billingJsonResponse({ error: "plan_id required" }, 400);
  }

  const service = createServiceClient();
  const jwtUser = auth.user!;
  const authUser = (await loadAuthUserProfile(service, jwtUser.id)) ?? jwtUser;
  const customer = resolveCustomerProfile(authUser, {
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_mobile: body.customer_mobile,
  });

  const { data: plan, error: planError } = await service
    .from("subscription_plans")
    .select("id, name_ar, price_kwd, duration_days, is_active")
    .eq("id", planId)
    .single();

  if (planError || !plan || !plan.is_active) {
    return billingJsonResponse({ error: "Plan not found" }, 404);
  }

  const amount = Number(plan.price_kwd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return billingJsonResponse({ error: "Invalid plan price" }, 400);
  }

  const { data: tx, error: txError } = await service
    .from("payment_transactions")
    .insert({
      user_id: jwtUser.id,
      plan_id: plan.id,
      status: "pending",
      amount_kwd: amount,
      customer_reference: null,
    })
    .select("id")
    .single();

  if (txError || !tx) {
    return billingJsonResponse({ error: txError?.message ?? "Failed to create transaction" }, 500);
  }

  const nativeSdk = body.native_sdk === true;
  if (nativeSdk) {
    return billingJsonResponse({
      transactionId: tx.id,
    });
  }

  const customerReference = tx.id;
  const callBackUrl = `${mfConfig.appUrl}/api/billing/callback?status=success&transactionId=${tx.id}`;
  const errorUrl = `${mfConfig.appUrl}/api/billing/callback?status=failed&transactionId=${tx.id}`;

  try {
    const payment = await sendPayment({
      invoiceValue: amount,
      customerReference,
      customerName: customer.name,
      customerEmail: customer.email,
      customerMobile: customer.mobile,
      mobileCountryCode: customer.mobileCountryCode,
      callBackUrl,
      errorUrl,
      userDefinedField: customerReference,
    });

    await service
      .from("payment_transactions")
      .update({
        customer_reference: customerReference,
        invoice_id: String(payment.InvoiceId),
        payment_url: payment.InvoiceURL,
      })
      .eq("id", tx.id);

    return billingJsonResponse({
      transactionId: tx.id,
      paymentUrl: payment.InvoiceURL,
      invoiceId: payment.InvoiceId,
    });
  } catch (e) {
    await service
      .from("payment_transactions")
      .update({ status: "failed" })
      .eq("id", tx.id);

    const message = e instanceof Error ? e.message : "Payment initiation failed";
    const lower = message.toLowerCase();
    if (
      lower.includes("token is not valid") ||
      lower.includes("expired") ||
      lower.includes("api key is not configured")
    ) {
      return billingJsonResponse({ error: "Payment gateway not configured" }, 503);
    }
    return billingJsonResponse({ error: message }, 502);
  }
}
