'use client';

import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { useMessaging, useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

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
        // REPLACE THIS STRING with your VAPID Key from Firebase Console
        // Project Settings > Cloud Messaging > Web Push certificates
        const VAPID_PUBLIC_KEY = 'BG23EpfiydTqftIbv45uiwbvT5PvbhFFvocywM3ICJGjt6xQisxoQIFW2uWR6iZlg4THXlXzDLB2RpMNClgw05c';

        if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
            console.warn('FCM: VAPID Public Key not set. Push notifications will not work in production.');
            return;
        }

        if ('Notification' in window && Notification.permission === 'granted') {
            const currentToken = await getToken(messaging, {
              vapidKey: VAPID_PUBLIC_KEY
            });

            if (currentToken) {
              setToken(currentToken);
              console.log('FCM Token Generated:', currentToken);
              
              // Sync token to Firestore to enable push notifications for this device
              const userRef = doc(firestore, 'users', user.uid);
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(currentToken),
                lastTokenSync: serverTimestamp()
              }).catch((err) => {
                  console.error("Failed to sync FCM token to Firestore:", err);
              });
            } else {
              console.warn('FCM: No registration token available. Request permission to generate one.');
            }
        }
      } catch (err) {
        console.error('Failed to retrieve FCM token:', err);
      }
    };

    // Small delay to allow firebase initialization to stabilize
    const timer = setTimeout(retrieveToken, 3000);
    return () => clearTimeout(timer);
  }, [messaging, user, firestore]);

  return token;
}
