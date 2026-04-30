# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is fully configured to use **testifyglobal.com** for all branding and authentication.

### Fixing "Invalid Request" or 404 Errors

To make the "behind-the-scenes" handshake work on your custom domain, you **must** complete these manual steps in the Google and Firebase consoles. Code changes alone cannot bypass these security requirements:

1.  **Google Cloud Console (Fixes "Invalid Request"):**
    *   Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
    *   Select project: **studio-6220967431-56fe2**.
    *   Find your **OAuth 2.0 Client ID** (usually 'Web client').
    *   Add `https://testifyglobal.com` to **Authorized JavaScript origins**.
    *   Add `https://testifyglobal.com/__/auth/handler` to **Authorized redirect URIs**. **(Crucial Step)**

2.  **Firebase Console (Fixes 404 Errors):**
    *   Go to [Firebase Console](https://console.firebase.google.com/) > Build > Authentication > Settings.
    *   Add `testifyglobal.com` to the **Authorized domains** list.

**Why this matters:** By setting `authDomain` to `testifyglobal.com` in `src/firebase/config.ts`, users will see your domain in the Google Login window instead of a generic Firebase URL. The `next.config.ts` rewrite handles the technical communication between your domain and Firebase's servers.

---

To get started with coding, take a look at `src/app/page.tsx`.
