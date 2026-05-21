import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function buildSearchText(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Safe object key for Supabase Storage (no spaces or special chars). */
export function sanitizeStorageFilename(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  const ext =
    lastDot > 0 ? filename.slice(lastDot).toLowerCase().replace(/[^.a-z0-9]/g, "") : ".pdf";
  const stem = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const safeStem = stem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${safeStem || "gazette"}${safeExt || ".pdf"}`;
}

export function slugify(text: string) {
  return text
    .trim()
    .slice(0, 80)
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .toLowerCase() || `item-${Date.now()}`;
}
