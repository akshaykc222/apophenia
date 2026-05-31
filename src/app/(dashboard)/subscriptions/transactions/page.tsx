import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildUserEmailMap,
  countActiveSubscriptions,
} from "@/lib/billing/admin-data";
import type { PaymentTransaction } from "@/lib/billing/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "فشل",
  expired: "منتهي",
};

export default async function SubscriptionTransactionsPage() {
  const service = createServiceClient();

  type TxRow = PaymentTransaction & { user_id: string };
  let transactions: TxRow[] | null = null;
  let activeCount = 0;
  let txError: { message: string } | null = null;
  let emailMap = new Map<string, { email: string }>();

  try {
    const [txRes, subsRes, emails] = await Promise.all([
      service
        .from("payment_transactions")
        .select(
          "id, user_id, status, amount_kwd, invoice_id, payment_id, paid_at, created_at, plan:subscription_plans(name_ar)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      service
        .from("user_subscriptions")
        .select("id, status, is_lifetime, expires_at"),
      buildUserEmailMap(service),
    ]);

    transactions = (txRes.data ?? []) as unknown as TxRow[];
    txError = txRes.error;
    emailMap = emails;
    activeCount = countActiveSubscriptions(subsRes.data ?? []);
    if (subsRes.error && !txError) txError = subsRes.error;
  } catch (e) {
    txError = { message: e instanceof Error ? e.message : "فشل التحميل" };
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">معاملات الدفع</h1>
          <p className="mt-1 text-sm text-zinc-500">
            سجل المدفوعات من MyFatoorah والاشتراكات المفعّلة.
          </p>
        </div>
        <div className="flex gap-4 text-sm text-zinc-400">
          <Link href="/subscriptions/enrolled" className="hover:text-white">
            المشتركون
          </Link>
          <Link href="/subscriptions/plans" className="hover:text-white">
            خطط الاشتراك
          </Link>
        </div>
      </div>

      {txError && (
        <p className="rounded-lg bg-red-900/30 p-3 text-sm text-red-300">
          {txError.message.includes("does not exist")
            ? "نفّذ migrations 012 و 013 في Supabase."
            : txError.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-400">
            اشتراكات نشطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{activeCount}</p>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 text-right font-medium">المستخدم</th>
              <th className="px-4 py-3 text-right font-medium">الخطة</th>
              <th className="px-4 py-3 text-right font-medium">المبلغ</th>
              <th className="px-4 py-3 text-right font-medium">الحالة</th>
              <th className="px-4 py-3 text-right font-medium">فاتورة MF</th>
              <th className="px-4 py-3 text-right font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((tx) => (
              <tr key={tx.id} className="border-b border-zinc-800/80">
                <td className="px-4 py-3 text-xs text-zinc-500" dir="ltr">
                  {emailMap.get(tx.user_id)?.email ?? tx.user_id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">{tx.plan?.name_ar ?? "—"}</td>
                <td className="px-4 py-3">{tx.amount_kwd} د.ك</td>
                <td className="px-4 py-3">
                  {STATUS_LABEL[tx.status] ?? tx.status}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {tx.invoice_id ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(tx.paid_at ?? tx.created_at).toLocaleString(
                    "ar-KW"
                  )}
                </td>
              </tr>
            ))}
            {!transactions?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  لا توجد معاملات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
