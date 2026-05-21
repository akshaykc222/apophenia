import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { extractIssue } from "@/inngest/functions/extract-issue";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [extractIssue],
});
