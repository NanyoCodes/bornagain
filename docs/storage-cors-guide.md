# How to Fix Firebase Storage CORS Policy (Visual Guide)

If you are seeing errors like `Max retry time for operation exceeded` or `storage/unauthorized`, it almost always means that a Cross-Origin Resource Sharing (CORS) policy issue is preventing your web application from uploading photos to Firebase Storage. This is a standard browser security feature.

**This guide provides a straightforward, visual method using the Google Cloud Console website, which is more reliable than command-line tools like `gsutil`.**

---

### Understanding Firebase vs. Google Cloud Console

This can be confusing, so here is a simple way to understand it:

*   **Firebase Console:** This is where you **create** the storage bucket by clicking "Get started" in the Storage section. This makes the bucket exist.
*   **Google Cloud Console:** This is where you manage the **advanced settings** for that same bucket. Because Firebase is built on top of Google Cloud, this console gives you access to deeper settings, like the CORS policy.

---

### Step 1: Go to Google Cloud Storage

1.  **[Click here to go directly to the Google Cloud Storage browser](https://console.cloud.google.com/storage/browser)**.

2.  You may be asked to log in. Use the same Google account you use for Firebase.

### Step 2: **CRITICAL** - Select the Correct Project

This is the most important step. At the top of the Google Cloud page, you will see a project selector dropdown, usually next to the "Google Cloud" logo.

1.  Click on the project selector.
2.  Find and select your project: **`studio-6220967431-56fe2`**.

If you do not see this project in the list, you may be logged in with the wrong Google account.

### Step 3: Find and Click Your Bucket Link

Once you are in the correct project, you will see a table listing your storage buckets.

1.  Look for the **"Name"** column in the table.
2.  You will see a single entry that is a blue, underlined link. It will start with `studio-6220967431-56fe2...`

    **CRITICAL:** Click this link. This is your storage bucket.

    **Note on Naming:** Google Cloud's interface can be confusing. The text of this link might say `...firebasestorage.app` or it might say `...appspot.com`. **It does not matter what the text says.** The important thing is to click the link in the "Name" column to open your bucket's settings.

*   **Troubleshooting:** If you have selected the correct project but you do not see *any* buckets in this list, it means Storage was not enabled correctly. Please go back to the [Firebase Console](https://console.firebase.google.com/project/studio-6220967431-56fe2/storage), select your project, go to **Build > Storage**, and click **"Get started"**. After it's created, refresh the Google Cloud page.

### Step 4: Configure CORS

1.  After clicking on your bucket link, you will see several tabs like "Objects", "Configuration", etc. Click the **"Permissions"** tab.

2.  On the Permissions page, scroll down until you see the **Cross-origin resource sharing (CORS)** section.

3.  Click the **"Edit"** button. An "Edit CORS" panel will appear.

4.  Click **"Add an entry"**.

5.  Now, fill in the fields exactly like this:
    *   **Origins:**
        *   Type `http://localhost:3000` and press Enter.
        *   Type `https://studio-6220967431-56fe2.web.app` and press Enter.
        *   Type `https://studio-6220967431-56fe2.firebaseapp.com` and press Enter.
        *   Type `https://studio--studio-6220967431-56fe2.us-central1.hosted.app` and press Enter.
    *   **Methods:**
        *   Check the boxes for `GET`, `PUT`, `POST`, and `DELETE`.
    *   **Response headers:**
        *   Type `Content-Type` and press Enter.
        *   Type `x-goog-resumable` and press Enter.
    *   **Max age:**
        *   Enter `3600`.

6.  Click the **"Save"** button at the bottom of the panel.

It might take a minute or two for the settings to apply. Once saved, photo uploads from your application should now work correctly, both on your local machine and when deployed.
