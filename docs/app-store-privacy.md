# App Store — Privacy & Guideline 5.1.1(v)

## Privacy Policy URL (required in App Store Connect)

```
https://apophenia-five.vercel.app/privacy
```

Terms of use (optional but linked from signup):

```
https://apophenia-five.vercel.app/terms
```

Set **Privacy Policy URL** under App Information → App Privacy in App Store Connect.

## Guideline 5.1.1(v) — guest access

The mobile app allows **browsing without registration**:

- Home feed (published news)
- CAPT tenders tab
- Search and article detail
- Help

Account is required only for:

- Favorites
- Subscription / billing
- AI assistant (also requires active subscription)
- Account notifications

Sign-in screen includes **تصفح بدون تسجيل** (browse without account).

## Environment (Vercel)

Optional:

- `SUPPORT_EMAIL` — shown on privacy page (default `support@kuwaittoday.example`)
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` — payment receipt emails
- Firebase Admin — push on subscription activation

## Deep link after payment

Hosted checkout success page opens:

```
apophenia://subscription
```

Registered on iOS (`Info.plist`) and Android (`AndroidManifest.xml`).
