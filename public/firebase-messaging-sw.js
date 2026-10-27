// This script is the Service Worker for Firebase Cloud Messaging.
// It handles background push notifications when the tab is closed.

importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
// Note: These values match your src/firebase/config.ts
firebase.initializeApp({
  apiKey: "AIzaSyD9kYktgT6rSHdr5efM0cwHhIe61zf9ZeM",
  authDomain: "testifyglobal.com",
  projectId: "studio-6220967431-56fe2",
  storageBucket: "studio-6220967431-56fe2.firebasestorage.app",
  messagingSenderId: "313468907372",
  appId: "1:313468907372:web:03150678a218e7f21d0d49"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico' // Ensure you have an icon at this path
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
