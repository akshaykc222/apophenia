import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit";

export async function activateSubscriptionForTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  opts?: {
    invoiceId?: string;
    paymentId?: string;
    mfReference?: string;
    rawWebhook?: unknown;
  }
): Promise<{ activated: boolean; skipped?: string; subscriptionId?: string }> {
  const { data: tx, error: txError } = await supabase
    .from("payment_transactions")
    .select("id, user_id, plan_id, status, amount_kwd")
    .eq("id", transactionId)
    .single();

  if (txError || !tx) {
    return { activated: false, skipped: "transaction_not_found" };
  }

  if (tx.status === "paid") {
    return { activated: false, skipped: "already_paid" };
  }

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
    .select("id, duration_days, name_ar, is_lifetime")
    .eq("id", tx.plan_id)
    .single();

  if (planError || !plan) {
    return { activated: false, skipped: "plan_not_found" };
  }

  const now = new Date();
  const isLifetime = Boolean(plan.is_lifetime);

  const { data: currentSub } = await supabase
    .from("user_subscriptions")
    .select("id, expires_at, is_lifetime")
    .eq("user_id", tx.user_id)
    .eq("status", "active")
    .or(`is_lifetime.eq.true,expires_at.gt.${now.toISOString()}`)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { computeSubscriptionExpiry } = await import("@/lib/billing/plan-utils");

  let baseDate = now;
  if (
    !isLifetime &&
    currentSub &&
    !currentSub.is_lifetime &&
    currentSub.expires_at &&
    new Date(currentSub.expires_at) > now
  ) {
    baseDate = new Date(currentSub.expires_at);
  }

  const { expiresAt, isLifetime: subLifetime } = computeSubscriptionExpiry({
    isLifetime,
    durationDays: plan.duration_days,
    baseDate,
  });

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

  if (updateTxError) {
    throw updateTxError;
  }

  if (currentSub) {
    await supabase
      .from("user_subscriptions")
      .update({ status: "expired" })
      .eq("id", currentSub.id);
  }

  const { data: sub, error: subError } = await supabase
    .from("user_subscriptions")
    .insert({
      user_id: tx.user_id,
      plan_id: plan.id,
      transaction_id: transactionId,
      status: "active",
      starts_at: paidAt,
      expires_at: expiresAt,
      is_lifetime: subLifetime,
    })
    .select("id")
    .single();

  if (subError) {
    throw subError;
  }

  await logAudit(supabase, {
    actorId: tx.user_id,
    action: "subscription_activated",
    entityType: "user_subscription",
    entityId: sub.id,
    payload: {
      transaction_id: transactionId,
      plan_id: plan.id,
      plan_name: plan.name_ar,
      expires_at: expiresAt,
      is_lifetime: subLifetime,
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
    .update({
      status: "failed",
      raw_webhook: rawWebhook ?? undefined,
    })
    .eq("id", transactionId)
    .in("status", ["pending"]);
}
