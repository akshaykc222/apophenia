export function mfConfig() {
  const apiKey = Deno.env.get("MYFATOORAH_API_KEY") ?? "";
  const baseUrl = (Deno.env.get("MYFATOORAH_BASE_URL") ?? "https://apitest.myfatoorah.com").replace(/\/$/, "");
  const webhookSecret = Deno.env.get("MYFATOORAH_WEBHOOK_SECRET") ?? "";
  const currency = Deno.env.get("MYFATOORAH_CURRENCY") ?? "KWD";
  const appUrl = (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ?? "").replace(/\/$/, "");
  return { apiKey, baseUrl, webhookSecret, currency, appUrl, isConfigured: Boolean(apiKey) };
}

export async function mfPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { apiKey, baseUrl } = mfConfig();
  if (!apiKey) throw new Error("MYFATOORAH_API_KEY not set");

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || !json.IsSuccess) {
    const detail =
      json.ValidationErrors?.map((e: { Name: string; Error: string }) => `${e.Name}: ${e.Error}`).join("; ") ||
      json.Message ||
      res.statusText;
    throw new Error(`MyFatoorah ${path}: ${detail}`);
  }
  return json.Data as T;
}

export function buildPaymentStatusSignaturePayload(data: {
  Invoice?: { Id?: string; Status?: string; ExternalIdentifier?: string; Reference?: string };
  Transaction?: { Status?: string; PaymentId?: string };
}): string {
  return [
    `Invoice.Id=${data.Invoice?.Id ?? ""}`,
    `Invoice.Status=${data.Invoice?.Status ?? ""}`,
    `Transaction.Status=${data.Transaction?.Status ?? ""}`,
    `Transaction.PaymentId=${data.Transaction?.PaymentId ?? ""}`,
    `Invoice.ExternalIdentifier=${data.Invoice?.ExternalIdentifier ?? ""}`,
  ].join(",");
}

export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!secret || !signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signatureHeader.trim();
}
