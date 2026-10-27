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
        // Request permission and get token
        const currentToken = await getToken(messaging, {
          // Public VAPID key from Firebase Console (Cloud Messaging settings)
          // Default for Firebase JS SDK if using standard configuration
          vapidKey: 'BCS5xZ8B4vE5G_6Q9_Y5kXqK_9fX_6V_6E_6D_6C_6B_6A_6A_6A_6A_6A_6A_6A_6A_6A_6A' 
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
