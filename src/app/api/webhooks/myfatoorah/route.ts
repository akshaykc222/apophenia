import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  activateSubscriptionForTransaction,
  markTransactionFailed,
} from "@/lib/myfatoorah/activate-subscription";
import {
  buildPaymentStatusSignaturePayload,
  verifyWebhookSignature,
} from "@/lib/myfatoorah/signature";
import { getMyFatoorahConfig } from "@/lib/myfatoorah/config";
import type { WebhookV2Event } from "@/lib/myfatoorah/types";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let event: WebhookV2Event;

  try {
    event = JSON.parse(rawBody) as WebhookV2Event;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { webhookSecret } = getMyFatoorahConfig();
  const signatureHeader = request.headers.get("myfatoorah-signature");

  if (webhookSecret) {
    const payload = buildPaymentStatusSignaturePayload(event.Data);
    if (!verifyWebhookSignature(payload, signatureHeader, webhookSecret)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if (event.Event?.Code !== 1) {
    return Response.json({ ok: true, skipped: "unsupported_event" });
  }

  const service = createServiceClient();
  const invoiceId = event.Data?.Invoice?.Id ?? "";
  const transactionStatus = event.Data?.Transaction?.Status ?? "";
  const invoiceStatus = event.Data?.Invoice?.Status ?? "";
  const externalId = event.Data?.Invoice?.ExternalIdentifier ?? "";
  const paymentId = event.Data?.Transaction?.PaymentId ?? "";

  let transactionId = externalId;

  if (!transactionId && invoiceId) {
    const { data: byInvoice } = await service
      .from("payment_transactions")
      .select("id")
      .eq("invoice_id", invoiceId)
      .maybeSingle();
    transactionId = byInvoice?.id ?? "";
  }

  if (!transactionId) {
    return Response.json({ ok: true, skipped: "transaction_not_found" });
  }

  const success =
    transactionStatus === "SUCCESS" ||
    invoiceStatus === "PAID";

  if (success) {
    await activateSubscriptionForTransaction(service, transactionId, {
      invoiceId,
      paymentId,
      mfReference: event.Data?.Invoice?.Reference,
      rawWebhook: event,
    });
  } else if (
    transactionStatus === "FAILED" ||
    transactionStatus === "CANCELED"
  ) {
    await markTransactionFailed(service, transactionId, event);
  }

  return Response.json({ ok: true });
}
