export type PaymentTransactionStatus = "pending" | "paid" | "failed" | "expired";
export type UserSubscriptionStatus = "active" | "expired" | "cancelled";

export interface SubscriptionPlan {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  price_kwd: number;
  duration_days: number | null;
  is_lifetime: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  plan_id: string;
  status: PaymentTransactionStatus;
  amount_kwd: number;
  invoice_id: string | null;
  payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  plan?: { name_ar: string } | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: UserSubscriptionStatus;
  is_lifetime: boolean;
  starts_at: string;
  expires_at: string;
  created_at: string;
  plan?: { name_ar: string; duration_days: number | null; is_lifetime?: boolean } | null;
}
