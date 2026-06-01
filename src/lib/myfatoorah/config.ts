function resolveAppUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "";
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function getMyFatoorahConfig() {
  const apiKey = process.env.MYFATOORAH_API_KEY?.trim();
  const baseUrl =
    process.env.MYFATOORAH_BASE_URL?.trim() || "https://apitest.myfatoorah.com";
  const webhookSecret = process.env.MYFATOORAH_WEBHOOK_SECRET?.trim() ?? "";
  const currency = process.env.MYFATOORAH_CURRENCY?.trim() || "KWD";
  const appUrl = resolveAppUrl();

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    webhookSecret,
    currency,
    appUrl: appUrl.replace(/\/$/, ""),
    isConfigured: Boolean(apiKey),
  };
}
