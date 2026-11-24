# Firebase App Hosting Secrets Guide

To enable server-side features like **Email Verification** and **Identity Activation**, you must configure your Firebase Service Account secrets in the App Hosting dashboard.

## 1. Generate the Service Account Key

1.  Open the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project: **studio-6220967431-56fe2**.
3.  Click the **Gear icon** (Project settings) in the top-left sidebar.
4.  Navigate to the **Service accounts** tab.
5.  Click the **Generate new private key** button at the bottom.
6.  A JSON file will download to your computer. Open it with a text editor (like Notepad or VS Code).

## 2. Insert Secrets into App Hosting

1.  In the Firebase Console, go to **Build** > **App Hosting**.
2.  Select your active backend.
3.  Go to the **Settings** tab.
4.  Scroll down to the **Secrets** section.
5.  Click **Add secret** (you may need to "Grant access" to Cloud Secret Manager first).

Add the following three secrets exactly as named:

### Secret 1: `FIREBASE_PRIVATE_KEY`
*   **Value**: Copy the text inside the `"private_key"` field from your JSON file. 
*   **Important**: Include the entire block starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----\n`.

### Secret 2: `FIREBASE_CLIENT_EMAIL`
*   **Value**: Copy the email address inside the `"client_email"` field from your JSON file.

### Secret 3: `RESEND_API_KEY`
*   **Value**: Your API key from [resend.com](https://resend.com). This is required to send the branded activation emails from `verify@bornagainglobal.com`.

## 3. Deployment
Once the secrets are added, trigger a new deployment by pushing a commit to your repository. The application will now be able to securely generate verification links at runtime.
