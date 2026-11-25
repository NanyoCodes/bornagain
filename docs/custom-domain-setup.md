# Custom Domain Setup: bornagainglobal.com

This guide explains how to ensure your application is accessible at your custom domain.

## Step 1: Connect Domain in Firebase

1.  Open the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project: **studio-6220967431-56fe2**.
3.  Go to **Build > App Hosting**.
4.  Click on your backend dashboard.
5.  Go to the **Settings** tab.
6.  Under **Domains**, click **Add custom domain**.
7.  Enter `bornagainglobal.com`.
8.  Firebase will provide you with two **A records** (IP addresses).

## Step 2: Update DNS at Registrar

1.  Log in to your domain provider (e.g., Namecheap, GoDaddy, Cloudflare).
2.  Go to the **DNS Management** for `bornagainglobal.com`.
3.  Add two **A records**:
    *   **Host**: `@` (or leave blank)
    *   **Value**: [The first IP from Firebase]
    *   **Host**: `@` (or leave blank)
    *   **Value**: [The second IP from Firebase]
4.  Add a **CNAME record** for `www`:
    *   **Host**: `www`
    *   **Value**: `bornagainglobal.com`

## Step 3: Authorize for Authentication

1.  In the Firebase Console, go to **Authentication > Settings**.
2.  Click **Authorized domains**.
3.  Add `bornagainglobal.com` and `www.bornagainglobal.com`.

## Step 4: Wait for Propagation

DNS changes can take up to 24 hours to propagate. Firebase will automatically issue a free SSL certificate once the domain is verified.

### Troubleshooting
*   **404 Error**: If you see a generic Firebase 404, the domain is pointed correctly, but the deployment hasn't finished or the domain isn't linked to the right backend.
*   **Privacy Warning**: This means the SSL certificate is still being generated. Wait 1-2 hours.
