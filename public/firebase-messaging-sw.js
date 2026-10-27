// Give the service worker access to Firebase Messaging.
// Note: compat version is used here for simpler script importing.
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyD9kYktgT6rSHdr5efM0cwHhIe61zf9ZeM",
  authDomain: "testifyglobal.com",
  projectId: "studio-6220967431-56fe2",
  storageBucket: "studio-6220967431-56fe2.firebasestorage.app",
  messagingSenderId: "313468907372",
  appId: "1:313468907372:web:03150678a218e7f21d0d49"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title || 'Kingdom Alert';
  const notificationOptions = {
    body: payload.notification.body || 'A new update is available.',
    icon: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    badge: 'https://i.ibb.co/j9JTYdc6/new-testify-logo.png?v=3',
    data: {
      url: payload.data?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
