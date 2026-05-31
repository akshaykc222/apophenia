import { createServiceClient } from "@/lib/supabase/server";
import { SubscriptionPlansManager } from "@/components/subscriptions/subscription-plans-manager";
import type { SubscriptionPlan } from "@/lib/billing/types";

export default async function SubscriptionPlansPage() {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .select("*")
    .order("sort_order")
    .order("created_at");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">خطط الاشتراك</h1>
        <p className="mt-1 text-sm text-zinc-500">
          إدارة خطط الدفع لمرة واحدة عبر MyFatoorah — تظهر في تطبيق Flutter.
        </p>
      </div>
      {error && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {error.message.includes("does not exist")
            ? "نفّذ migration 012_billing.sql في Supabase."
            : error.message}
        </p>
      )}
      <SubscriptionPlansManager initialPlans={(data ?? []) as SubscriptionPlan[]} />
    </div>
  );
}
