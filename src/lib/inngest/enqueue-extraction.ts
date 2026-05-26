import { inngest } from "@/inngest/client";

export type EnqueueExtractionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Sends gazette extraction to Inngest. Requires INNGEST_EVENT_KEY (+ signing key on Vercel).
 * Sync app URL in Inngest dashboard: https://YOUR_DOMAIN/api/inngest
 */
export async function enqueueIssueExtraction(
  issueId: string
): Promise<EnqueueExtractionResult> {
  const eventKey = process.env.INNGEST_EVENT_KEY?.trim();
  const signingKey = process.env.INNGEST_SIGNING_KEY?.trim();

  if (!eventKey) {
    const hint =
      process.env.VERCEL === "1"
        ? "أضف INNGEST_EVENT_KEY و INNGEST_SIGNING_KEY في Vercel، واربط التطبيق في dashboard.inngest.com → Sync /api/inngest"
        : "شغّل Inngest Dev (`npx inngest-cli dev`) أو عيّن INNGEST_EVENT_KEY في .env.local";
    return { ok: false, error: `Inngest غير مهيأ. ${hint}` };
  }

  if (process.env.VERCEL === "1" && !signingKey) {
    return {
      ok: false,
      error:
        "INNGEST_SIGNING_KEY مفقود على Vercel. أضفه من Inngest → Manage → Signing key.",
    };
  }

  try {
    await inngest.send({
      name: "gazette/issue.uploaded",
      data: { issueId },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `فشل إرسال مهمة الاستخراج إلى Inngest: ${msg}`,
    };
  }
}
