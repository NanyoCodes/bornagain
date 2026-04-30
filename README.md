# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is hosted at **testifyglobal.com**.

### Why Authentication fails on Custom Domains (404 Error)

The reason your login works on the `studio-....` domain but gives a 404 on `testifyglobal.com` is technical:

1.  **Security Handlers:** Firebase Authentication requires special hidden files (handlers) to be served at a specific path: `/__/auth/handler`.
2.  **Pre-provisioning:** On the default `firebaseapp.com` domain, these files are always active and configured by Google.
3.  **Custom Domain Authorization:** For these handlers to work on `testifyglobal.com`, the domain **must** be added to the **Authorized Domains** list in the Firebase Console (Build > Authentication > Settings).
4.  **Propagation Delay:** Even after adding it, it can take several hours for the global security certificates and handlers to provision for your specific domain.

**The Solution:**
I have set the `authDomain` in `src/firebase/config.ts` back to the default `firebaseapp.com` address. This is the **industry standard** for stability. It ensures that the "behind-the-scenes" login popup always finds its security files, regardless of which domain the user is actually visiting.

### How to use your Custom Domain for Emails

You can still make your verification and password reset emails look like they come from `testifyglobal.com` without breaking the login process:

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Go to **Build > Authentication > Templates**.
3.  For each email type (e.g., Password Reset), click the **Edit (pencil)** icon.
4.  Click **"customize Action URL"** at the bottom.
5.  Set the URL to `https://testifyglobal.com/__/auth/action`.

---

To get started with coding, take a look at `src/app/page.tsx`.
