# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is hosted at **testifyglobal.com**.

### Troubleshooting "Invalid Request" or 404 Errors

If you receive errors during Google Sign-in on `testifyglobal.com`, follow these manual steps in your consoles. These are **required** by Google for security and cannot be fixed by code alone:

1.  **Google Cloud Console (Critical for "Invalid Request"):**
    *   Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
    *   Find your **OAuth 2.0 Client ID** (usually called 'Web client').
    *   Add `https://testifyglobal.com` to the **Authorized JavaScript origins**.
    *   Add `https://testifyglobal.com/__/auth/handler` to the **Authorized redirect URIs**.

2.  **Firebase Console (Critical for 404s):**
    *   Go to [Firebase Console](https://console.firebase.google.com/) > Build > Authentication > Settings.
    *   Add `testifyglobal.com` to the **Authorized domains** list.

**Note:** I have reverted the `authDomain` in `src/firebase/config.ts` to the stable project default. This is the recommended configuration to ensure your login works 100% of the time while your custom domain security settings are being provisioned by Google.

---

To get started with coding, take a look at `src/app/page.tsx`.
