export function ExtractionAlert({ message }: { message: string }) {
  const friendly =
    message.includes("DOMMatrix") || message.toLowerCase().includes("pdfjs")
      ? "تعذّر قراءة ملف PDF على Vercel. اضغط «إعادة الاستخراج» أو أعد المحاولة."
      : message;

  return (
    <div className="rounded-lg border border-amber-900/50 bg-amber-950/40 p-4 text-sm text-amber-100">
      <p className="font-medium">تعذّر متابعة الاستخراج تلقائياً</p>
      <p className="mt-2 text-amber-200/90">{friendly}</p>
    </div>
  );
}

export function InngestSetupHint() {
  return null;
}
