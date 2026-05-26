# Firebase push notifications

Admin can send push notifications to **all app users** or **selected users** from `/notifications/push`. The Flutter app registers FCM tokens in Supabase and shows an in-app inbox.

## Architecture

| Layer | Role |
|-------|------|
| **FCM topic** `kuwait_today_all` | Broadcast to every device that subscribed on login |
| **FCM multicast** | Targeted send to tokens for selected `user_id`s |
| **`device_tokens`** | One row per user + FCM token (Flutter upserts on login) |
| **`user_notifications`** | In-app inbox (all targeted users get a row, even without a device) |
| **`push_campaigns`** | Admin audit log of each send |

## 1. Firebase Console

1. Create or open a project at [Firebase Console](https://console.firebase.google.com/).
2. Add an **Android** app (`com.apophenia.apophenia_flutter`) and an **iOS** app (your bundle id).
3. Download **`google-services.json`** → `apophenia_flutter/android/app/google-services.json`
4. Download **`GoogleService-Info.plist`** → `apophenia_flutter/ios/Runner/GoogleService-Info.plist`
5. Enable **Cloud Messaging** (FCM) for the project.

## 2. Service account (admin API)

1. Firebase → Project settings → **Service accounts** → **Generate new private key**.
2. Copy the JSON **as a single line** into Vercel / local env:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Redeploy the admin app after setting this variable.

## 3. Supabase migration

Run in SQL Editor (or CLI):

```text
supabase/migrations/009_push_notifications.sql
```

## 4. Flutter `.env`

Add values from Firebase → Project settings → **Your apps** → SDK config:

```env
FIREBASE_API_KEY=...
FIREBASE_APP_ID=1:...:android:...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_PROJECT_ID=...
# iOS only (from GoogleService-Info.plist)
FIREBASE_IOS_BUNDLE_ID=com.apophenia.apopheniaFlutter
```

Alternatively run `flutterfire configure` and use generated `lib/firebase_options.dart` (see `push_notification_service.dart`).

## 5. Android Gradle

Ensure `android/app/google-services.json` exists, then apply the Google Services plugin (see project `android/app/build.gradle.kts`).

## 6. iOS

1. Open `ios/Runner.xcworkspace` in Xcode.
2. Enable **Push Notifications** and **Background Modes** → Remote notifications.
3. Upload your APNs key in Firebase → Cloud Messaging → Apple app configuration.

## 7. Admin usage

1. Sign in to the admin panel.
2. Open **إرسال إشعارات** in the sidebar.
3. Enter title and body, choose **all users** or pick users from the list.
4. Submit — campaign appears in the table below the form.

**Note:** Instant push delivery requires a registered device token. In-app history is stored for all targeted users regardless of token.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Firebase غير مهيأ` | Set `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel |
| Broadcast not received | Confirm Flutter logged in and subscribed to `kuwait_today_all` |
| Selected user no push | User has no row in `device_tokens` (open app while signed in) |
| Android build fails | Add `google-services.json` under `android/app/` |
