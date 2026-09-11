# Google OAuth Verification Guide

If you are using the **Google Contacts Import** feature, you may see a warning saying "Google hasn't verified this app" when users try to sync their contacts. This is normal for new applications and can be resolved by following Google's verification process.

---

### Phase 1: Preparation (Bypassing the Warning during Testing)

While your app is in development, you can still test the feature:

1.  When the "Google hasn't verified this app" screen appears, click **"Advanced"**.
2.  Click **"Go to testifyglobal.com (unsafe)"** at the bottom.
3.  Proceed with granting permissions.

*Note: You can add up to 100 "Test Users" in the Google Cloud Console who can bypass this screen without clicking "Advanced".*

---

### Phase 2: Official Verification Process

To remove the warning for all users, you must submit your app for verification.

#### Step 1: Configure OAuth Consent Screen
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to **APIs & Services > OAuth consent screen**.
3.  Ensure your **User Type** is set to **External**.
4.  Provide accurate App Information:
    *   **App name:** Testify
    *   **User support email:** Your email address.
    *   **App logo:** Upload the Testify flame logo.
    *   **Authorized domains:** Add `testifyglobal.com`.
    *   **Developer contact info:** Your email address.

#### Step 2: Add Required Scopes
The contact import feature requires the following scope:
*   `https://www.googleapis.com/auth/contacts.readonly`

You must provide a justification for why your app needs this scope (e.g., "To allow users to organize their soul-winning efforts by importing existing contacts as converts for follow-up tracking.")

#### Step 3: Link Privacy Policy and TOS
Google requires publicly accessible links to your legal documents:
*   **Privacy Policy:** `https://testifyglobal.com/privacy-policy`
*   **Terms of Service:** `https://testifyglobal.com/terms-of-service`

#### Step 4: Submit for Verification
1.  Click **"Submit for Verification"** on the OAuth consent screen dashboard.
2.  Google's trust and safety team will review your app. This usually takes 3-7 business days.
3.  They may send you an email asking for a short video demonstrating how your app uses the requested scopes.

---

### Phase 3: Enable the People API
For the import to function, the People API must be enabled in your project:
1.  Go to **APIs & Services > Library**.
2.  Search for **"Google People API"**.
3.  Click **Enable**.

---

### Troubleshooting
*   **Error 403: access_denied:** This usually means you haven't added the user as a "Test User" in the Google Cloud Console or the People API is disabled.
*   **Redirect URI Mismatch:** Ensure `https://testifyglobal.com/__/auth/handler` is added to your OAuth 2.0 Client ID under "Authorized redirect URIs".

By completing these steps, Testify will be recognized as a verified partner by Google, providing a seamless and secure experience for all believers.