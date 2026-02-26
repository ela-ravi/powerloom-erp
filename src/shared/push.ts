import { sql } from "../config/database.js";

/**
 * Push notification service using Firebase Cloud Messaging.
 * Gracefully no-ops when firebase-admin is not installed or configured.
 *
 * To enable:
 * 1. pnpm add firebase-admin
 * 2. Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS env vars
 */

let firebaseApp: any = null;
let messaging: any = null;
let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return !!messaging;
  initialized = true;

  if (!process.env.FIREBASE_PROJECT_ID) return false;

  try {
    // Dynamic import — firebase-admin is an optional dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = await (Function(
      'return import("firebase-admin")',
    )() as Promise<any>);
    firebaseApp = admin.default.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    messaging = admin.default.messaging();
    return true;
  } catch {
    // firebase-admin not installed or config invalid — push disabled
    return false;
  }
}

/**
 * Send a push notification to a user's device.
 * No-ops if FCM is not configured or user has no token.
 */
export async function sendPush(
  tenantId: string,
  userId: string,
  data: { title: string; body: string; data?: Record<string, string> },
): Promise<void> {
  const ready = await ensureInitialized();
  if (!ready) return;

  try {
    const user = await sql<{ fcm_token: string | null }[]>`
      SELECT fcm_token FROM users
      WHERE id = ${userId} AND tenant_id = ${tenantId} AND fcm_token IS NOT NULL
    `;
    if (user.length === 0 || !user[0].fcm_token) return;

    await messaging.send({
      token: user[0].fcm_token,
      notification: { title: data.title, body: data.body },
      data: data.data,
    });
  } catch {
    // Token may be stale — clear it
    try {
      await sql`
        UPDATE users SET fcm_token = NULL WHERE id = ${userId} AND tenant_id = ${tenantId}
      `;
    } catch {
      // Swallow
    }
  }
}

/**
 * Register or update a user's FCM device token.
 */
export async function registerToken(
  tenantId: string,
  userId: string,
  token: string,
): Promise<void> {
  await sql`
    UPDATE users SET fcm_token = ${token}
    WHERE id = ${userId} AND tenant_id = ${tenantId}
  `;
}
