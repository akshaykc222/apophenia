export function parsePlanDurationInput(body: {
  is_lifetime?: boolean;
  duration_days?: number | string | null;
}): { ok: true; isLifetime: boolean; durationDays: number | null } | { ok: false; error: string } {
  const isLifetime = body.is_lifetime === true;

  if (isLifetime) {
    return { ok: true, isLifetime: true, durationDays: null };
  }

  const days = Number(body.duration_days);
  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, error: "أدخل مدة بالأيام أو فعّل مدى الحياة" };
  }

  return { ok: true, isLifetime: false, durationDays: Math.trunc(days) };
}
