import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function activateSubscriptionForTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  opts?: {
    invoiceId?: string;
    paymentId?: string;
    mfReference?: string;
    rawWebhook?: unknown;
  }
) {
  const { data: tx, error: txError } = await supabase
    .from("payment_transactions")
    .select("id, user_id, plan_id, status")
    .eq("id", transactionId)
    .single();

  if (txError || !tx) return { activated: false, skipped: "transaction_not_found" };
  if (tx.status === "paid") return { activated: false, skipped: "already_paid" };

  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (existingSub) {
    await supabase
      .from("payment_transactions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", transactionId);
    return { activated: false, skipped: "already_activated", subscriptionId: existingSub.id };
  }

  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("id, duration_days, name_ar")
    .eq("id", tx.plan_id)
    .single();

  if (planError || !plan) return { activated: false, skipped: "plan_not_found" };

  const now = new Date();
  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("id, expires_at")
    .eq("user_id", tx.user_id)
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const baseDate =
    currentSub?.expires_at && new Date(currentSub.expires_at) > now
      ? new Date(currentSub.expires_at)
      : now;

  const expiresAt = new Date(baseDate);
  expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
  const paidAt = now.toISOString();

  const { error: updateTxError } = await supabase
    .from("payment_transactions")
    .update({
      status: "paid",
      paid_at: paidAt,
      invoice_id: opts?.invoiceId ?? undefined,
      payment_id: opts?.paymentId ?? undefined,
      mf_reference: opts?.mfReference ?? undefined,
      raw_webhook: opts?.rawWebhook ?? undefined,
    })
    .eq("id", transactionId)
    .eq("status", "pending");

  if (updateTxError) throw updateTxError;

  if (currentSub) {
    await supabase.from("user_subscriptions").update({ status: "expired" }).eq("id", currentSub.id);
  }

  const { data: sub, error: subError } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: tx.user_id,
      plan_id: plan.id,
      transaction_id: transactionId,
      status: "active",
      starts_at: paidAt,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (subError) throw subError;

  await supabase.from("audit_log").insert({
    actor_id: tx.user_id,
    action: "subscription_activated",
    entity_type: "user_subscription",
    entity_id: sub.id,
    payload: {
      transaction_id: transactionId,
      plan_id: plan.id,
      plan_name: plan.name_ar,
      expires_at: expiresAt.toISOString(),
    },
  });

  return { activated: true, subscriptionId: sub.id };
}

export async function markTransactionFailed(
  supabase: SupabaseClient,
  transactionId: string,
  rawWebhook?: unknown
) {
  await supabase
    .from("payment_transactions")
    .update({ status: "failed", raw_webhook: rawWebhook ?? undefined })
    .eq("id", transactionId)
    .in("status", ["pending"]);
}
