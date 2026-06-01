import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CustomerProfile = {
  name: string;
  email: string;
  mobile: string;
  mobileCountryCode: string;
};

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function nameFromMetadata(meta: Record<string, unknown> | undefined): string | null {
  if (!meta) return null;

  const direct = pickString(
    meta.display_name,
    meta.full_name,
    meta.name,
    meta.customer_name
  );
  if (direct) return direct;

  const first = pickString(meta.first_name, meta.given_name);
  const last = pickString(meta.last_name, meta.family_name);
  if (first && last) return `${first} ${last}`;
  if (first) return first;

  return null;
}

function parseKuwaitMobile(phone: string | null | undefined): {
  mobile: string;
  countryCode: string;
} {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return { mobile: "", countryCode: "965" };

  if (digits.startsWith("965") && digits.length > 3) {
    return { mobile: digits.slice(3), countryCode: "965" };
  }
  if (digits.length >= 8) {
    return { mobile: digits.slice(-8), countryCode: "965" };
  }
  return { mobile: "", countryCode: "965" };
}

export function resolveCustomerProfile(
  user: User,
  overrides?: {
    customer_name?: string | null;
    customer_email?: string | null;
    customer_mobile?: string | null;
  }
): CustomerProfile {
  const meta = user.user_metadata as Record<string, unknown> | undefined;

  const name =
    pickString(overrides?.customer_name) ||
    nameFromMetadata(meta) ||
    "Apophenia User";

  const email = pickString(overrides?.customer_email, user.email) ?? "";

  const phoneRaw =
    pickString(overrides?.customer_mobile, user.phone) ||
    pickString(meta?.phone, meta?.mobile, meta?.phone_number);

  const { mobile, countryCode } = parseKuwaitMobile(phoneRaw);

  return {
    name,
    email,
    mobile,
    mobileCountryCode: countryCode,
  };
}

/** Load freshest auth user (metadata may be missing on JWT-only object). */
export async function loadAuthUserProfile(
  service: SupabaseClient,
  userId: string
): Promise<User | null> {
  const { data, error } = await service.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user;
}
