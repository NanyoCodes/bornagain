# Hosting Your Application

This application is set up to be easily deployed using **Firebase App Hosting**. App Hosting provides a secure, fast, and scalable hosting solution with a streamlined workflow that integrates with your development process.

## How Deployment Works

This project is configured for continuous deployment. Every time you push a commit to your `main` branch, App Hosting will automatically:

1.  Build your Next.js application.
2.  Deploy it to a live production environment.
3.  Serve it globally via a high-speed CDN.

You don't need to manually run any build or deploy commands.

## Adding a Custom Domain

By default, your application will be available at a Firebase-provided subdomain (e.g., `your-app-name.web.app`). To connect your own custom domain, follow these steps in the Firebase Console:

1.  **Navigate to App Hosting:**
    *   Open your Firebase project.
    *   In the left-hand navigation pane, go to **Build > App Hosting**.

2.  **Add Custom Domain:**
    *   Select your App Hosting backend.
    *   Click on **"Add custom domain"**.
    *   The console will guide you through the process, which typically involves:
        *   Entering the domain name you want to connect (e.g., `www.yourdomain.com`).
        *   Verifying that you own the domain. This is usually done by adding a `TXT` record to your domain's DNS settings.
        *   Updating your domain's `A` records to point to the IP addresses provided by Firebase.

3.  **Wait for Propagation:**
    *   DNS changes can take anywhere from a few minutes to 48 hours to propagate across the internet.
    *   Firebase will automatically provision an SSL certificate for your domain, ensuring it's served securely over `https`.

Once the process is complete, your application will be live on your custom domain!

## Questions?

For more detailed information, you can always refer to the official [Firebase App Hosting documentation](https://firebase.google.com/docs/app-hosting).
