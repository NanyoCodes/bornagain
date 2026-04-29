# Testify - Global Evangelism Platform

This is a NextJS application built for the global body of Christ.

## Production Domain: testifyglobal.com

The app is configured to use **testifyglobal.com** as its primary domain and authentication handler.

### Final Confirmation Steps (Action Required)

To ensure `testifyglobal.com` works as your main and auth domain, you must perform these steps in your dashboards:

#### 1. Firebase Console (Auth Confirmation)
- Go to **Build > Authentication > Settings**.
- Click **Authorized domains**.
- Ensure `testifyglobal.com` is added to the list. This "confirms" to Firebase that your domain is allowed to handle sign-ins.

#### 2. Google Cloud Console (Social Login Confirmation)
- Go to the [Google Cloud Credentials Page](https://console.cloud.google.com/apis/credentials).
- Edit your **OAuth 2.0 Client ID** (usually named "Web client").
- Under **Authorized redirect URIs**, add: `https://testifyglobal.com/__/auth/handler`.
- This confirms your custom domain as a valid security handler for Google Sign-in.

#### 3. Firebase App Hosting (DNS Confirmation)
- Go to **Build > App Hosting**.
- Select your backend and click **Add custom domain**.
- Follow the instructions to add a `TXT` record for verification and an `A` record to point your domain to Firebase.

#### 4. Storage CORS (Upload Confirmation)
- Run the following command in your terminal to confirm your domain is allowed to upload files:
  ```bash
  gcloud storage buckets update gs://studio-6220967431-56fe2.appspot.com --cors-file=cors.json
  ```

---

To get started with coding, take a look at `src/app/page.tsx`.
