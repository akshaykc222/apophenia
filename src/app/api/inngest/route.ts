import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { extractIssue } from "@/inngest/functions/extract-issue";
import { syncCaptTenders } from "@/inngest/functions/sync-capt-tenders";

export const runtime = "nodejs";
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [extractIssue, syncCaptTenders],
});
