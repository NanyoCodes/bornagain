# How to Fix Google Maps Errors

If Google Maps features (like location search, address autocomplete, and campaign maps) are not loading or are showing an error, it is almost always due to a problem with your Google Maps Platform API key.

**This is a configuration issue that you must resolve in your Google Cloud project.** This guide will walk you through the process.

---

### Prerequisite: Select the Correct Project

Before proceeding, ensure you have the correct project selected in the Google Cloud Console.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  At the top of the page, click the project selector dropdown.
3.  Find and select your project: **`studio-6220967431-56fe2`**.

---

### Step 1: Create an API Key

First, you need an API key to authenticate your app's requests to Google Maps.

1.  Go to the [Google Cloud Credentials page](https://console.cloud.google.com/apis/credentials?project=studio-6220967431-56fe2).
2.  Click **"+ CREATE CREDENTIALS"** at the top of the page and select **"API key"**.
3.  A new key will be created. **Copy this key immediately.** You will need it in a later step.
4.  It is highly recommended to restrict your key for security. Click **"EDIT API KEY"** and under **"Application restrictions"**, select **"Websites"**. Add your app's domains (e.g., `localhost:3000` and your deployed app URL `studio--studio-6220967431-56fe2.us-central1.hosted.app`).

---

### Step 2: Enable Required APIs

For the maps and location search to work, you must enable three specific APIs.

1.  Go to the [Google Cloud API Library](https://console.cloud.google.com/apis/library?project=studio-6220967431-56fe2).
2.  Search for and enable each of the following APIs:
    *   **Maps JavaScript API** (for displaying maps)
    *   **Places API** (for address search and autocomplete)
    *   **Geocoding API** (for converting coordinates to addresses)

    If an API is already enabled, you will see a "MANAGE" button instead of "ENABLE".

---

### Step 3: Check Your Project's Billing Plan

The Google Maps Platform requires a billing account to be linked to your project, even if your usage falls within the generous free tier.

1.  Go to the [Google Cloud Billing Page](https://console.cloud.google.com/billing?project=studio-6220967431-56fe2).
2.  Check if there is an active billing account associated with your project. If not, you will see prompts to create one or link an existing one. **This step is mandatory.**

---

### Step 4: Add the API Key to Your Application

The final step is to add the API key you copied in Step 1 to your application's environment file.

1.  Open the `.env` file in your project's root directory.
2.  Find the line `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...`
3.  Paste your API key after the `=` sign. The line should look like this:
    ```
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...Your...Key...Here
    ```
4.  **Important:** After saving the `.env` file, you must **restart your development server** for the change to take effect.

After completing these four steps, the Google Maps features in your application should load correctly.
