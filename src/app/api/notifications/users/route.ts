import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { user, isAdmin } = await requireAdmin(supabase);

  if (!user || !isAdmin) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const service = createServiceClient();

  const { data: adminRows } = await service.from("admin_users").select("user_id");
  const adminIds = new Set((adminRows ?? []).map((r) => r.user_id));

  const { data: authData, error: authError } = await service.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const { data: tokenRows } = await service
    .from("device_tokens")
    .select("user_id");

  const usersWithTokens = new Set((tokenRows ?? []).map((t) => t.user_id));

  const users = (authData.users ?? [])
    .filter((u) => !adminIds.has(u.id))
    .filter((u) => {
      if (!q) return true;
      const email = (u.email ?? "").toLowerCase();
      const name = String(u.user_metadata?.display_name ?? "").toLowerCase();
      return email.includes(q) || name.includes(q);
    })
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      display_name: (u.user_metadata?.display_name as string) ?? null,
      has_device_token: usersWithTokens.has(u.id),
      created_at: u.created_at,
    }))
    .sort((a, b) => (b.has_device_token ? 1 : 0) - (a.has_device_token ? 1 : 0));

  return NextResponse.json({ users });
}
