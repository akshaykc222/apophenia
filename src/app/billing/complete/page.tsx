
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
      body: "لم تكتمل العملية. جرّب مرة أخرى من التطبيق.",
      tone: "text-red-400",
    },
    pending: {
      title: "جاري تأكيد الدفع",
      body: "انتظر قليلاً ثم افتح التطبيق — قد يستغرق التفعيل بضع ثوانٍ.",
      tone: "text-amber-400",
    },
  };

  const msg = messages[result ?? "pending"] ?? messages.pending;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="max-w-md space-y-4 text-center">
        <h1 className={`text-2xl font-bold ${msg.tone}`}>{msg.title}</h1>
        <p className="text-zinc-400">{msg.body}</p>
        {transactionId && (
          <p className="font-mono text-xs text-zinc-600">{transactionId}</p>
        )}

      </div>
    </main>
  );
}
