import type { SupabaseClient } from "@supabase/supabase-js";
import { getMessaging } from "@/lib/firebase/admin";

export async function sendUserPush(
  service: SupabaseClient,
  userId: string,
  params: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<{ sent: number; failed: number }> {
  const { data: tokens } = await service
    .from("device_tokens")
    .select("id, fcm_token")
    .eq("user_id", userId);

  const rows = tokens ?? [];
  if (rows.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messaging = getMessaging();
  const staleTokenIds: string[] = [];
  let sent = 0;
  let failed = 0;

  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const response = await messaging.sendEachForMulticast({
      tokens: chunk.map((t) => t.fcm_token as string),
      notification: { title: params.title, body: params.body },
      data: {
        type: "subscription_activated",
        ...params.data,
      },
    });
    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered"
        ) {
          staleTokenIds.push(chunk[idx].id as string);
        }
      }
    });
  }

  if (staleTokenIds.length > 0) {
    await service.from("device_tokens").delete().in("id", staleTokenIds);
  }

  return { sent, failed };
}
