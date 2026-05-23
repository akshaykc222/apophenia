/** Rows not touched during PDF bootstrap within this window are "stale". */
export const STALE_REFERENCE_DAYS = 90;

export function isStaleReference(
  lastSeenAt: string | null | undefined
): boolean {
  if (!lastSeenAt) return true;
  const cutoff = Date.now() - STALE_REFERENCE_DAYS * 24 * 60 * 60 * 1000;
  return new Date(lastSeenAt).getTime() < cutoff;
}
