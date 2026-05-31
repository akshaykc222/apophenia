import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";
import { runCaptSync } from "@/lib/capt/sync";
import { getCaptConfig } from "@/lib/capt/config";

export async function POST() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const service = createServiceClient();
  const result = await runCaptSync(service, user.id);
  const status = result.ok ? 200 : 502;
  return NextResponse.json(result, { status });
}

export async function GET() {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);
  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const config = getCaptConfig();
  return NextResponse.json({
    enabled: config.enabled,
    tenders_url: config.tendersUrl,
    firecrawl_configured: config.isFirecrawlConfigured,
    note: config.isFirecrawlConfigured
      ? null
      : "Add FIRECRAWL_API_KEY from https://firecrawl.dev (free tier: 500 credits).",
  });
}
