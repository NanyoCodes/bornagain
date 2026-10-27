// Import and configure the Firebase SDK
// These scripts are made available when the app is served or via CDN
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-messaging-compat.js');

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
  
  const notificationTitle = payload.notification.title || 'Kingdom Alert';
  const notificationOptions = {
    body: payload.notification.body || 'A new update is available.',
    icon: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    badge: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
