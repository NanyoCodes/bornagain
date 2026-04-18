
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

function initializeFirebase() {
  console.log("Attempting to initialize Firebase...");
  const apps = getApps();
  let app;

  if (apps.length > 0) {
    app = apps[0];
    console.log("Found existing Firebase app instance.");
  } else {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Initialized new Firebase app for project ID:", firebaseConfig.projectId);
    } catch (e) {
      console.error("Firebase initialization failed:", e);
      throw e;
    }
  }

  try {
    const auth = getAuth(app);
    // Forcing long-polling to work around potential network issues in some environments.
    const firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
    const storage = getStorage(app);
    console.log("Firebase services (Auth, Firestore, Storage) obtained successfully.");
    return { app, auth, firestore, storage };
  } catch (e) {
     console.error("Failed to get Firebase services:", e);
     throw e;
  }
}

export { initializeFirebase };
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
