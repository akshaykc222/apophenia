# App Store & Play Store — Privacy (Guideline 5.1.1(v))

## Privacy Policy URL (required in App Store Connect)

```
https://apophenia-five.vercel.app/privacy
```

Terms of use (linked from sign-up):

```
https://apophenia-five.vercel.app/terms
```

Set **Privacy Policy URL** under App Store Connect → App Information.

Also link the same URL in Google Play Console → App content → Privacy policy.

## App name

Legal pages use **السور** / **Al-Soor** (see `src/lib/legal/public-app.ts`).

## Access model (matches app behavior)

The mobile app is **subscription-only**:

1. User creates an account (email + password).
2. User accepts Terms & Privacy Policy at sign-up.
3. User purchases and activates a paid subscription.
4. Only then can the user access content and features.

There is **no guest browse** mode. The privacy policy must state this clearly — a mismatch caused the iOS Guideline 5.1.1(v) rejection.

## App Privacy (Apple) — suggested labels

Align App Store Connect “App Privacy” with the policy:

| Data type | Linked to user | Used for |
|-----------|----------------|----------|
| Email address | Yes | Account, receipts |
| Name | Yes | Account display |
| User ID | Yes | Auth, subscription |
| Purchase history | Yes | Subscription access |
| Other user content (AI chat) | Yes | AI assistant |
| Device ID (FCM token) | Yes | Push notifications (with consent) |
| Product interaction | Optional | App functionality |
| Crash data | No | Diagnostics |

- **Tracking:** No — app does not track users across apps/websites for ads.
- **Data not collected:** Precise location, contacts, photos, browsing history for ads.

## Google Play Data safety

Same disclosures: account data, purchase info, app activity (chat), device identifiers (FCM). No data sold. Encryption in transit. Users can request account deletion via support email.

## In-app links

Privacy policy is linked from:

- Sign-up screen (`SignUpLegalText` in Flutter)
- Profile → Privacy Policy

## Environment (Vercel)

Optional:

- `SUPPORT_EMAIL` — shown on privacy/terms pages (default `support@alfaresi.com`)

## Resubmit checklist

1. Deploy updated `/privacy` and `/terms` to Vercel.
2. Verify URLs load with **Al-Soor** branding and subscription-required language.
3. Update App Store Connect Privacy Policy URL if domain changed.
4. Align App Privacy questionnaire with sections 4–7 of the policy.
5. In App Store review notes, state: *“Al-Soor requires account sign-up and active subscription to access content; this is documented in our privacy policy.”*

## Deep link after payment

Hosted checkout success page opens:

```
apophenia://subscription
```

Registered on iOS (`Info.plist`) and Android (`AndroidManifest.xml`).
