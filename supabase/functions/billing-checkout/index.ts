import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { mfConfig, mfPost } from "../_shared/myfatoorah.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
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

  const { apiKey, currency, appUrl, isConfigured } = mfConfig();
  if (!isConfigured) {
    return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
      status: 503,
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

  const user = userData.user;
  let body: { plan_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const planId = body.plan_id?.trim();
  if (!planId) {
    return new Response(JSON.stringify({ error: "plan_id required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: plan, error: planError } = await service
    .from("subscription_plans")
    .select("id, name_ar, price_kwd, is_active")
    .eq("id", planId)
    .single();

  if (planError || !plan || !plan.is_active) {
    return new Response(JSON.stringify({ error: "Plan not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const amount = Number(plan.price_kwd);
  const { data: tx, error: txError } = await service
    .from("payment_transactions")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "pending",
      amount_kwd: amount,
    })
    .select("id")
    .single();

  if (txError || !tx) {
    return new Response(JSON.stringify({ error: txError?.message ?? "Failed to create transaction" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const callbackBase = appUrl || Deno.env.get("SUPABASE_URL")!.replace(".supabase.co", ".vercel.app");
  const callBackUrl = `${callbackBase}/api/billing/callback?status=success&transactionId=${tx.id}`;
  const errorUrl = `${callbackBase}/api/billing/callback?status=failed&transactionId=${tx.id}`;

  try {
    const session = await mfPost<{ SessionId: string }>("/v2/InitiateSession", {
      CustomerIdentifier: user.id,
    });

    const payment = await mfPost<{
      InvoiceId: number;
      PaymentURL: string;
    }>("/v2/ExecutePayment", {
      SessionId: session.SessionId,
      InvoiceValue: amount,
      DisplayCurrencyIso: currency,
      CustomerReference: tx.id,
      CustomerIdentifier: tx.id,
      CustomerName: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
      CustomerEmail: user.email ?? "",
      CustomerMobile: user.phone ?? "",
      CallBackUrl: callBackUrl,
      ErrorUrl: errorUrl,
      UserDefinedField: tx.id,
      Language: "AR",
    });

    await service
      .from("payment_transactions")
      .update({
        customer_reference: tx.id,
        session_id: session.SessionId,
        invoice_id: String(payment.InvoiceId),
        payment_url: payment.PaymentURL,
      })
      .eq("id", tx.id);

    return new Response(
      JSON.stringify({
        transactionId: tx.id,
        sessionId: session.SessionId,
        paymentUrl: payment.PaymentURL,
        invoiceId: payment.InvoiceId,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    await service.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
    const message = e instanceof Error ? e.message : "Payment initiation failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
