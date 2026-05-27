import { NextResponse } from "next/server";

export async function GET() {
  const hasEventKey = Boolean(process.env.INNGEST_EVENT_KEY?.trim());
  const hasSigningKey = Boolean(process.env.INNGEST_SIGNING_KEY?.trim());

  return NextResponse.json({
    ok: hasEventKey && hasSigningKey,
    has_event_key: hasEventKey,
    has_signing_key: hasSigningKey,
    vercel: process.env.VERCEL === "1",
    hint: !hasEventKey
      ? "INNGEST_EVENT_KEY missing — redeploy after adding to Vercel Production."
      : !hasSigningKey
        ? "INNGEST_SIGNING_KEY missing on Production."
        : null,
  });
}
