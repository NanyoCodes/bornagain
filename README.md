# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is hosted at **testifyglobal.com**.

### Troubleshooting Authentication (404 Errors)

If you receive a 404 error during login on `testifyglobal.com`, follow these steps:

1.  **Firebase Console - Authorized Domains:**
    *   Go to [Firebase Console](https://console.firebase.google.com/) > Build > Authentication > Settings.
    *   Add `testifyglobal.com` to the **Authorized domains** list.

2.  **Google Cloud Console - Redirect URIs:**
    *   Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials).
    *   Find your **OAuth 2.0 Client ID** (Web client).
    *   Add `https://testifyglobal.com/__/auth/handler` to the **Authorized redirect URIs**.

3.  **Wait for DNS:**
    *   Custom domain authentication requires Google to provision security certificates for the handlers. This can take several hours after adding the domain to the Authorized list.

**Note:** I have added a proxy rewrite in `next.config.ts` to route auth requests correctly, which should resolve the issue immediately once Step 1 is completed.

---

To get started with coding, take a look at `src/app/page.tsx`.
