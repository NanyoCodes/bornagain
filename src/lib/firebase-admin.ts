import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * @fileOverview Lazy-initialization utility for Firebase Admin SDK.
 * This pattern prevents the Next.js build process from crashing when 
 * environment variables/secrets are missing during static analysis.
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

  const options: any = {
    projectId,
  };

  // If we have full service account details (local dev or explicit secrets)
  if (clientEmail && privateKey) {
    options.credential = cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    });
  }
  // Otherwise, initialize with just the Project ID. 
  // On Google infrastructure (App Hosting), it will use Application Default Credentials.

  const app = initializeApp(options);

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
