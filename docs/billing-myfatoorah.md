# MyFatoorah billing (one-time subscriptions)

Admin-managed plans (custom duration or **lifetime**), MyFatoorah checkout from Flutter, webhook on **Vercel**, and content gating.

## 1. Supabase migrations

Run on project **apophenia** (`ixqrfjqhlxpjsbaswcpk`):

1. [`012_billing.sql`](../supabase/migrations/012_billing.sql)
2. [`013_billing_lifetime.sql`](../supabase/migrations/013_billing_lifetime.sql)

## 2. Vercel environment variables

| Variable | Description |
|----------|-------------|
| `MYFATOORAH_API_KEY` | API key from MyFatoorah portal |
| `MYFATOORAH_BASE_URL` | `https://apitest.myfatoorah.com` or live `https://api.myfatoorah.com` |
| `MYFATOORAH_WEBHOOK_SECRET` | Webhook V2 secure key |
| `MYFATOORAH_CURRENCY` | `KWD` |
| `APP_URL` | `https://apophenia-five.vercel.app` |
| `MOBILE_CORS_ORIGIN` | `*` or your app origin |

Redeploy after setting secrets.

## 3. MyFatoorah webhook

In [MyFatoorah portal → Webhook](https://docs.myfatoorah.com/docs/webhook):

- Version: **V2**
- URL: **`https://apophenia-five.vercel.app/api/webhooks/myfatoorah`**
- Secure key → `MYFATOORAH_WEBHOOK_SECRET`
- Event: **PAYMENT_STATUS_CHANGED**

## 4. Admin dashboard

| Page | Path |
|------|------|
| Plans (custom days + lifetime) | `/subscriptions/plans` |
| Enrolled users | `/subscriptions/enrolled` |
| Payment transactions | `/subscriptions/transactions` |
| App users (subscription column) | `/users` |

## 5. Flutter app

Set in `.env` / `--dart-define`:

```
ADMIN_API_URL=https://apophenia-five.vercel.app
```

Billing uses Vercel APIs (Bearer = Supabase access token):

| Endpoint | Method |
|----------|--------|
| `/api/billing/plans` | GET |
| `/api/billing/me` | GET |
| `/api/billing/checkout` | POST `{ "plan_id": "uuid" }` |

Checkout: open `paymentUrl` → webhook activates subscription → poll `/api/billing/me` until `active: true`. Lifetime plans return `is_lifetime: true` and `days_remaining: null`.

## 6. Content gating

RLS on `content_items` uses `has_active_subscription()` (includes lifetime).

`/api/mobile-chat` returns **402** with `subscription_required` if no active subscription.

## 7. Plan duration model

- **Timed:** `is_lifetime = false`, `duration_days` = any positive integer (30, 90, 365, or custom).
- **Lifetime:** `is_lifetime = true`, `duration_days = null`.

Renewals stack end dates for timed plans only; lifetime replaces stacking.
