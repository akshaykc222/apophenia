import { createHmac } from "node:crypto";
import type { WebhookPaymentStatusData } from "./types";

/** Build signature string for PAYMENT_STATUS_CHANGED (Webhook V2). */
export function buildPaymentStatusSignaturePayload(
  data: WebhookPaymentStatusData
): string {
  const invoiceId = data.Invoice?.Id ?? "";
  const invoiceStatus = data.Invoice?.Status ?? "";
  const transactionStatus = data.Transaction?.Status ?? "";
  const paymentId = data.Transaction?.PaymentId ?? "";
  const externalIdentifier = data.Invoice?.ExternalIdentifier ?? "";

  return [
    `Invoice.Id=${invoiceId}`,
    `Invoice.Status=${invoiceStatus}`,
    `Transaction.Status=${transactionStatus}`,
    `Transaction.PaymentId=${paymentId}`,
    `Invoice.ExternalIdentifier=${externalIdentifier}`,
  ].join(",");
}

export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(Buffer.from(payload, "utf8"))
    .digest("base64");

  return timingSafeEqual(expected, signatureHeader.trim());
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
