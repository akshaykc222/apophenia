import admin from "firebase-admin";

const FCM_TOPIC_ALL = "kuwait_today_all";

export { FCM_TOPIC_ALL };

function parseServiceAccount(): admin.ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json?.trim()) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
  }
  return JSON.parse(json) as admin.ServiceAccount;
}

export function getFirebaseAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  return admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount()),
  });
}

export function getMessaging() {
  return getFirebaseAdmin().messaging();
}

export function isFirebaseConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}
