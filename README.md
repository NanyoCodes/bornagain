# Firebase Studio

This is a NextJS starter in Firebase Studio.

## Initial Setup

Before your app can connect to Firebase services, you may need to enable them in the Firebase Console.

### 1. Enable Authentication

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project: **studio-6220967431-56fe2**.
3.  In the left menu, go to **Build > Authentication**.
4.  Click **Get started**.
5.  Enable the sign-in providers you want to use (e.g., Email/Password, Google). This app is configured for Email/Password and Google.

### 2. Create Firestore Database

This app uses Firestore to store data. If you see connection timeout errors, it likely means you need to create a database instance.

1.  In the Firebase Console, go to **Build > Firestore Database**.
2.  Click **Create database**.
3.  Choose **Start in production mode**. Click **Next**.
4.  Choose a location for your data (a region close to you is best). Click **Enable**.

### 3. Enable Firebase Storage

This app uses Firebase Storage for file uploads (like profile pictures).

1.  In the Firebase Console, go to **Build > Storage**.
2.  Click **Get started**.
3.  Follow the on-screen prompts, accepting the default security rules. Click **Done**.
4.  After the storage bucket is created, you must apply the correct CORS policy for uploads to work from your browser. Follow the steps in the [Storage CORS Guide](./docs/storage-cors-guide.md).

---

To get started with coding, take a look at `src/app/page.tsx`.

For instructions on how to push your code to a remote Git repository (like GitHub), please see the [Git Guide](./docs/git-guide.md).
