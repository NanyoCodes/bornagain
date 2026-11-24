import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * @fileOverview Build-safe initialization for Firebase Admin SDK.
 * Prevents build-time crashes by initializing with Project ID only if secrets are missing,
 * then using full credentials at runtime.
 */

export function initAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    const app = apps[0]!;
    return {
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "studio-6220967431-56fe2";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Build-time safety: If secrets are missing (standard during App Hosting builds),
  // we initialize with just the Project ID. Runtime functions will fail gracefully
  // or wait for the environment to provide the key.
  if (!privateKey || !clientEmail) {
    console.warn("Firebase Admin: Initializing with Project ID only. Authentication features will require secrets at runtime.");
    const app = initializeApp({ projectId });
    return {
      auth: getAuth(app),
      db: getFirestore(app),
    };
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    projectId,
  });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
