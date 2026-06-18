# App Store & Play Store — Privacy & Payments

## Privacy Policy URL

```
https://apophenia-five.vercel.app/privacy
```

## Payment model (Option A — web MyFatoorah on iOS)

| Platform | In-app payment | Subscription purchase |
|----------|----------------|----------------------|
| **iOS** | None (no MyFatoorah, no IAP UI) | Web only: `/billing/subscribe` |
| **Android** | MyFatoorah SDK | In-app |

### Web subscribe (MyFatoorah)

```
https://apophenia-five.vercel.app/billing/subscribe
```

Flow:

1. User creates account in the mobile app (or signs in on web with same credentials).
2. User opens web subscribe page in Safari (outside the iOS app).
3. Pays via MyFatoorah hosted checkout.
4. Returns to `/billing/complete` → deep link `apophenia://subscription`.
5. In iOS app: Profile → Subscription → **تحقق من الدفع** to refresh status.

**Important for App Store review:** The iOS app must **not** link to the web subscribe URL or show prices/checkout. No external purchase CTAs in the iOS binary.

## Guest browsing (Guideline 5.1.1(v))

Without account:

- Home feed, tenders, search, content detail, help

Account required:

- Favorites, notifications, subscription status, AI assistant

## Resubmit checklist

1. New iOS build with guest browse + no in-app payment.
2. Apply Supabase migration `015_content_public_read.sql` if not applied.
3. Deploy backend with `/billing/subscribe`.
4. App Review notes: guest browse + no in-app purchases; subscription managed outside app.
