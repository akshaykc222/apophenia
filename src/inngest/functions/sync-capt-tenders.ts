import { inngest } from "@/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { runCaptSync } from "@/lib/capt/sync";

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export const syncCaptTenders = inngest.createFunction(
  {
    id: "sync-capt-tenders",
    retries: 1,
    triggers: [{ cron: "0 5 * * *" }],
  },
  async ({ step }) => {
    return step.run("sync-capt-tenders", async () => {
      const supabase = getServiceSupabase();
      return runCaptSync(supabase);
    });
  }
);
