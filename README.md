# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is fully configured to use **testifyglobal.com** for all branding and authentication.

### Authentication Setup Status: COMPLETE

The application is now configured to handle the secure authentication handshake directly through **testifyglobal.com**. 

- **Auth Domain:** Set to `testifyglobal.com` in code.
- **Handshake Proxy:** Next.js rewrites handle the `/__/auth/` routes by proxying them to the secure Firebase backend.
- **Branding:** Users will now see `testifyglobal.com` in the Google Sign-in popup.

### Troubleshooting (If needed)

If you ever see "Invalid Request" or 404 errors in the future, verify these settings in the Google and Firebase consoles:

1.  **Google Cloud Console:**
    *   [Credentials Page](https://console.cloud.google.com/apis/credentials).
    *   Find the **OAuth 2.0 Client ID** (Web client).
    *   **Authorized JavaScript origins:** `https://testifyglobal.com`
    *   **Authorized redirect URIs:** `https://testifyglobal.com/__/auth/handler`

2.  **Firebase Console:**
    *   [Authentication Settings](https://console.firebase.google.com/project/_/authentication/settings).
    *   **Authorized domains:** Ensure `testifyglobal.com` is listed.

---

To get started with coding, take a look at `src/app/page.tsx`.
