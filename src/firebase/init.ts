import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

// Use a module-level variable to store the initialized services.
let firebaseServices: FirebaseServices | null = null;

export function initializeFirebase(): FirebaseServices {
  // Return existing services if already initialized on the client.
  if (typeof window !== 'undefined' && firebaseServices) {
    return firebaseServices;
  }
  
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  let firestore: Firestore;
  try {
    // Attempt to initialize with long polling for proxy/station compatibility.
    firestore = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (e: any) {
    // If Firestore is already initialized, get the existing instance.
    firestore = getFirestore(app);
  }
  
  const storage = getStorage(app);
  
  const services = { app, auth, firestore, storage };

  if (typeof window !== 'undefined') {
    firebaseServices = services;
  }

  return services;
}
