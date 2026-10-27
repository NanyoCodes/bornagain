// @ts-nocheck
/**
 * @fileOverview Firebase Messaging Service Worker.
 * Handles background push notifications when the app is not in focus.
 */

importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-messaging-compat.js');

// Config is hardcoded here because Service Workers operate in a separate global context
firebase.initializeApp({
  apiKey: "AIzaSyD9kYktgT6rSHdr5efM0cwHhIe61zf9ZeM",
  authDomain: "testifyglobal.com",
  projectId: "studio-6220967431-56fe2",
  storageBucket: "studio-6220967431-56fe2.firebasestorage.app",
  messagingSenderId: "313468907372",
  appId: "1:313468907372:web:03150678a218e7f21d0d49"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Testimony Update';
  const notificationOptions = {
    body: payload.notification?.body || 'Check out the latest Kingdom update on Testify.',
    icon: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    badge: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
