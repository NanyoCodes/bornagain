'use client';

import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { useMessaging, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

/**
 * Hook to retrieve and synchronize the FCM push notification token.
 * Stores tokens in a user's Firestore profile for backend notification targeting.
 */
export function useFcmToken() {
  const messaging = useMessaging();
  const { user } = useUser();
  const firestore = useFirestore();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!messaging || !user || !firestore) return;

    const retrieveToken = async () => {
      try {
        // REQUEST: Replace the string below with your actual VAPID public key from the Firebase Console.
        // Location: Project Settings > Cloud Messaging > Web Push certificates
        const VAPID_PUBLIC_KEY = 'PASTE_YOUR_VAPID_PUBLIC_KEY_HERE';

        if (VAPID_PUBLIC_KEY === 'PASTE_YOUR_VAPID_PUBLIC_KEY_HERE') {
            console.warn('FCM: VAPID Public Key not set. Push notifications will not work in production until you paste your key in src/hooks/use-fcm-token.ts');
            return;
        }

        const currentToken = await getToken(messaging, {
          vapidKey: VAPID_PUBLIC_KEY 
        });

        if (currentToken) {
          setToken(currentToken);
          
          // Sync token to Firestore to enable push notifications for this device
          const userRef = doc(firestore, 'users', user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(currentToken)
          }).catch(() => {
              // Silently fail if rules prevent update; token is still available locally
          });
        }
      } catch (err) {
        console.warn('Failed to retrieve FCM token:', err);
      }
    };

    retrieveToken();
  }, [messaging, user, firestore]);

  return token;
}
