# Born Again - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: bornagainglobal.com

The app is fully configured to use **bornagainglobal.com** for all branding and authentication.

### 🚀 Going Live Checklist

If you cannot access **bornagainglobal.com**, follow these steps:

1.  **Firebase Hosting Setup**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to **Build > App Hosting**.
    *   Select your active backend.
    *   In the **Settings** tab, click **Add custom domain**.
    *   Enter `bornagainglobal.com` and follow the instructions to update your DNS records (A records) at your domain registrar.

2.  **Authentication Authorization**:
    *   Go to **Build > Authentication > Settings**.
    *   In the **Authorized domains** section, ensure `bornagainglobal.com` is added.

3.  **Google OAuth Verification**:
    *   If users see a "unverified app" warning during Google Sign-in, refer to `docs/google-verification-guide.md`.

### Email Branding: Profile Photos

To ensure the **App Logo** appears as the profile photo when users receive verification or password reset emails:

1.  **Google Account Profile Picture**: The sender email address (e.g., `verify@bornagainglobal.com`) must have its profile picture set to the app logo at [myaccount.google.com](https://myaccount.google.com/).
2.  **Firebase Console Branding**:
    *   Go to [Authentication Settings](https://console.firebase.google.com/project/_/authentication/settings).
    *   In the **Templates** tab, ensure your "Public-facing name" is set to "Born Again".

---

To get started with coding, take a look at `src/app/page.tsx`.
