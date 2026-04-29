# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is hosted at **testifyglobal.com**.

### Troubleshooting the 404 Sign-in Error

If you receive a 404 error when trying to sign in, it is because the `authDomain` in the code was set to your custom domain (`testifyglobal.com`) before the domain was fully provisioned by Firebase to handle authentication requests.

**I have reverted the `authDomain` to the default project URL in `src/firebase/config.ts` to restore your ability to log in immediately.** 

This is a background technical setting and **does not** affect your users visiting `testifyglobal.com`. It is recommended to leave this as the default `firebaseapp.com` address for maximum stability.

### How to use your Custom Domain for Emails

To have password resets and verification emails point to your domain, you should configure the templates in the Firebase Console rather than changing the code:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Go to **Build > Authentication > Templates**.
3. For each email type, click the **Edit (pencil)** icon.
4. Click **"customize Action URL"** at the bottom.
5. Set the URL to `https://testifyglobal.com/__/auth/action`.

### Final Confirmation Steps for Hosting

To point your domain to this app:
1. Go to **Build > App Hosting** in the Firebase Console.
2. Select your backend and click **Add custom domain**.
3. Follow the instructions to add the `TXT` and `A` records to your DNS provider.

---

To get started with coding, take a look at `src/app/page.tsx`.
