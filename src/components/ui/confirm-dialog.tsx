"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  variant = "destructive",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="إغلاق"
        onClick={onCancel}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-xl",
          "text-right"
        )}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-white">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{description}</p>
        <div className="mt-6 flex flex-row-reverse gap-3">
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "جاري التنفيذ..." : confirmLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
