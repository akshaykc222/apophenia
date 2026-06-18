import Link from "next/link";
import { PUBLIC_APP_NAME_AR } from "@/lib/legal/public-app";

const APP_DEEP_LINK = "apophenia://subscription";

export default async function BillingCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ transactionId?: string; result?: string }>;
}) {
  const { transactionId, result } = await searchParams;

  const messages: Record<string, { title: string; body: string; tone: string }> = {
    success: {
      title: "تم الدفع بنجاح",
      body: "يمكنك العودة إلى التطبيق. سيتم تفعيل اشتراكك خلال ثوانٍ.",
      tone: "text-emerald-400",
    },
    failed: {
      title: "فشل الدفع",
      body: "لم تكتمل العملية. يمكنك المحاولة مرة أخرى من صفحة الاشتراك.",
      tone: "text-red-400",
    },
    pending: {
      title: "جاري تأكيد الدفع",
      body: "انتظر قليلاً ثم افتح التطبيق — قد يستغرق التفعيل بضع ثوانٍ.",
      tone: "text-amber-400",
    },
  };

  const msg = messages[result ?? "pending"] ?? messages.pending;
  const isSuccess = result === "success";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="max-w-md space-y-6 text-center">
        <h1 className={`text-2xl font-bold ${msg.tone}`}>{msg.title}</h1>
        <p className="text-zinc-400">{msg.body}</p>
        {transactionId && (
          <p className="font-mono text-xs text-zinc-600">{transactionId}</p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <a
            href={APP_DEEP_LINK}
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-zinc-900 transition hover:bg-zinc-200"
          >
            العودة إلى {PUBLIC_APP_NAME_AR}
          </a>
          {isSuccess && (
            <p className="text-xs text-zinc-500">
              ستصلك رسالة بريد وإشعار على جهازك عند اكتمال التفعيل.
            </p>
          )}
          <Link
            href="/privacy"
            className="text-sm text-zinc-500 underline hover:text-zinc-300"
          >
            سياسة الخصوصية
          </Link>
        </div>
      </div>
    </main>
  );
}
