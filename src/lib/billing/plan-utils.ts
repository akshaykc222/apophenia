/** Far-future expiry for lifetime rows (display only; access uses is_lifetime). */
export const LIFETIME_EXPIRES_AT = "2099-12-31T23:59:59.999Z";

export function computeSubscriptionExpiry(params: {
  isLifetime: boolean;
  durationDays: number | null;
  baseDate?: Date;
}): { expiresAt: string; isLifetime: boolean } {
  if (params.isLifetime) {
    return { expiresAt: LIFETIME_EXPIRES_AT, isLifetime: true };
  }
  const days = params.durationDays ?? 0;
  if (days <= 0) {
    throw new Error("duration_days required when not lifetime");
  }
  const base = params.baseDate ?? new Date();
  const expires = new Date(base);
  expires.setDate(expires.getDate() + days);
  return { expiresAt: expires.toISOString(), isLifetime: false };
}

export function formatPlanDuration(
  isLifetime: boolean,
  durationDays: number | null
): string {
  if (isLifetime) return "مدى الحياة";
  if (!durationDays) return "—";
  if (durationDays === 30) return "30 يوماً (شهر)";
  if (durationDays === 90) return "90 يوماً (3 أشهر)";
  if (durationDays === 365) return "365 يوماً (سنة)";
  return `${durationDays} يوماً`;
}

export function formatSubscriptionStatus(
  isLifetime: boolean,
  expiresAt: string,
  status: string
): string {
  if (status !== "active") {
    if (status === "expired") return "منتهي";
    if (status === "cancelled") return "ملغي";
    return status;
  }
  if (isLifetime) return "نشط — مدى الحياة";
  const exp = new Date(expiresAt);
  if (exp.getTime() <= Date.now()) return "منتهي";
  const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return `نشط — ${days} يوم متبقي`;
}
