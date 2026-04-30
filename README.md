# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is fully configured to use **testifyglobal.com** for all branding and authentication.

### Authentication Setup Status: COMPLETE

The application is now configured to handle the secure authentication handshake directly through **testifyglobal.com**. 

- **Auth Domain:** Set to `testifyglobal.com` in code.
- **Handshake Proxy:** Next.js rewrites handle the `/__/auth/` routes by proxying them to the secure Firebase backend.
- **Branding:** Users will now see `testifyglobal.com` in the Google Sign-in popup.

### Email Branding: Profile Photos

To ensure the **App Logo** appears as the profile photo when users receive verification or password reset emails, you must perform a one-time manual setup:

1.  **Google Account Profile Picture**: The sender email address (e.g., `support@testifyglobal.com` or your Gmail address used for sending) must have its profile picture set to the app logo.
    *   Go to [myaccount.google.com](https://myaccount.google.com/) for that specific email account.
    *   Click on the profile icon and upload the app logo.
    *   *Note:* It may take up to 48 hours for this to propagate to all email clients like Gmail.

2.  **Firebase Console Branding**:
    *   Go to the [Firebase Console Authentication Settings](https://console.firebase.google.com/project/_/authentication/settings).
    *   In the **Templates** tab, ensure your "Public-facing name" is set to "Testify".
    *   If using custom SMTP, ensure the logo is embedded in the HTML templates.

### Monetization: Going Live with Ads

The app is ready to display Christian-themed advertisements. To enable them:

1.  **Get your AdSense ID**: Sign up for [Google AdSense](https://adsense.google.com/) and get your Publisher ID (starts with `ca-pub-`).
2.  **Update Environment Variables**: In your production environment (e.g., Firebase App Hosting), set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` to your Publisher ID.
3.  **AdSense Console Settings**:
    *   To ensure **only Christian ads** appear, use the **Blocking controls** in the AdSense console to block irrelevant categories and allow faith-based categories.
    *   We have included metadata hints like `data-ad-channel="christian-content"` in the code to help Google's crawlers understand your site's context.

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
