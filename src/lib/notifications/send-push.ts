import type { SupabaseClient } from "@supabase/supabase-js";
import { getMessaging, FCM_TOPIC_ALL } from "@/lib/firebase/admin";

export type SendPushParams = {
  title: string;
  body: string;
  targetType: "all" | "selected";
  userIds: string[];
  sentBy: string;
};

export type SendPushResult = {
  campaignId: string;
  devicesTargeted: number;
  successCount: number;
  failureCount: number;
};

type TokenRow = { id: string; fcm_token: string; user_id: string };

export async function sendPushNotification(
  service: SupabaseClient,
  params: SendPushParams
): Promise<SendPushResult> {
  const messaging = getMessaging();

  let tokens: TokenRow[] = [];

  if (params.targetType === "all") {
    const { data } = await service.from("device_tokens").select("id, fcm_token, user_id");
    tokens = (data ?? []) as TokenRow[];
  } else {
    const ids = [...new Set(params.userIds)];
    if (ids.length === 0) {
      throw new Error("لم يتم اختيار مستخدمين");
    }
    const { data } = await service
      .from("device_tokens")
      .select("id, fcm_token, user_id")
      .in("user_id", ids);
    tokens = (data ?? []) as TokenRow[];
  }

  const { data: campaign, error: campaignError } = await service
    .from("push_campaigns")
    .insert({
      title_ar: params.title,
      body_ar: params.body,
      target_type: params.targetType,
      target_user_ids: params.targetType === "selected" ? params.userIds : [],
      sent_by: params.sentBy,
      devices_targeted: tokens.length,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    throw new Error(campaignError?.message ?? "فشل حفظ الحملة");
  }

  const campaignId = campaign.id as string;
  let userIdsForInbox: string[] = [];
  if (params.targetType === "all") {
    const { data: adminRows } = await service.from("admin_users").select("user_id");
    const adminIds = new Set((adminRows ?? []).map((r) => r.user_id));
    const { data: authData } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    userIdsForInbox = (authData?.users ?? [])
      .map((u) => u.id)
      .filter((id) => !adminIds.has(id));
  } else {
    userIdsForInbox = [...new Set(params.userIds)];
  }

  if (userIdsForInbox.length > 0) {
    const inboxRows = userIdsForInbox.map((userId) => ({
      user_id: userId,
      campaign_id: campaignId,
      title_ar: params.title,
      body_ar: params.body,
    }));
    await service.from("user_notifications").insert(inboxRows);
  }

  let successCount = 0;
  let failureCount = 0;
  const staleTokenIds: string[] = [];

  if (params.targetType === "all") {
    try {
      const res = await messaging.send({
        topic: FCM_TOPIC_ALL,
        notification: { title: params.title, body: params.body },
        data: {
          type: "admin_push",
          campaign_id: campaignId,
        },
      });
      if (res) successCount = tokens.length || 1;
    } catch (e) {
      console.error("FCM topic send failed:", e);
      failureCount = tokens.length || 1;
    }
  } else if (tokens.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const chunk = tokens.slice(i, i + batchSize);
      const response = await messaging.sendEachForMulticast({
        tokens: chunk.map((t) => t.fcm_token),
        notification: { title: params.title, body: params.body },
        data: { type: "admin_push", campaign_id: campaignId },
      });
      successCount += response.successCount;
      failureCount += response.failureCount;
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            staleTokenIds.push(chunk[idx].id);
          }
        }
      });
    }
  }

  if (staleTokenIds.length > 0) {
    await service.from("device_tokens").delete().in("id", staleTokenIds);
  }

  await service
    .from("push_campaigns")
    .update({
      success_count: successCount,
      failure_count: failureCount,
      devices_targeted: tokens.length,
    })
    .eq("id", campaignId);

  return {
    campaignId,
    devicesTargeted: tokens.length,
    successCount,
    failureCount,
  };
}
