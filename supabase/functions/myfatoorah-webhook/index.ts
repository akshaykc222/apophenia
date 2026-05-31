import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  activateSubscriptionForTransaction,
  markTransactionFailed,
} from "../_shared/activate-subscription.ts";
import {
  buildPaymentStatusSignaturePayload,
  mfConfig,
  verifyWebhookSignature,
} from "../_shared/myfatoorah.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, myfatoorah-signature",
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

  const rawBody = await req.text();
  let event: {
    Event?: { Code?: number };
    Data?: {
      Invoice?: { Id?: string; Status?: string; Reference?: string; ExternalIdentifier?: string };
      Transaction?: { Status?: string; PaymentId?: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { webhookSecret } = mfConfig();
  const signatureHeader = req.headers.get("myfatoorah-signature");

  if (webhookSecret) {
    const payload = buildPaymentStatusSignaturePayload(event.Data ?? {});
    const valid = await verifyWebhookSignature(payload, signatureHeader, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  if (event.Event?.Code !== 1) {
    return new Response(JSON.stringify({ ok: true, skipped: "unsupported_event" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const invoiceId = event.Data?.Invoice?.Id ?? "";
  const transactionStatus = event.Data?.Transaction?.Status ?? "";
  const invoiceStatus = event.Data?.Invoice?.Status ?? "";
  const externalId = event.Data?.Invoice?.ExternalIdentifier ?? "";
  const paymentId = event.Data?.Transaction?.PaymentId ?? "";

  let transactionId = externalId;
  if (!transactionId && invoiceId) {
    const { data } = await supabase
      .from("payment_transactions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    transactionId = data?.id ?? "";
  }

  if (!transactionId) {
    return new Response(JSON.stringify({ ok: true, skipped: "transaction_not_found" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const success = transactionStatus === "SUCCESS" || invoiceStatus === "PAID";

  if (success) {
    await activateSubscriptionForTransaction(supabase, transactionId, {
      invoiceId,
      paymentId,
      mfReference: event.Data?.Invoice?.Reference,
      rawWebhook: event,
    });
  } else if (transactionStatus === "FAILED" || transactionStatus === "CANCELED") {
    await markTransactionFailed(supabase, transactionId, event);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
