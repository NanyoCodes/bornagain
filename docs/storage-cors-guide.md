
# How to Fix Firebase Storage Uploads (Troubleshooting Guide)

If you are seeing errors like `net::ERR_FAILED` or `CORS policy` in your browser console when trying to upload photos, it means there is a configuration problem with your Google Cloud project. This guide provides a definitive checklist to solve it.

**The problem is NOT in the application's code. You must complete these steps in the Google Cloud Console.**

---

### Prerequisite: Select the Correct Project

This is the most critical step. Before proceeding, ensure you have the correct project selected in the Google Cloud Console.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  At the top of the page, click the project selector dropdown.
3.  Find and select your project: **`studio-6220967431-56fe2`**.

---

### Step 1: Check Your Project's Billing Plan

Firebase Storage requires your project to be on the **Blaze (Pay-as-you-go)** plan to function correctly with web applications. The free "Spark" plan has limitations that can cause these errors.

1.  Go to the [Firebase Console Billing Page](https://console.firebase.google.com/project/studio-6220967431-56fe2/usage/details).
2.  Check your current plan. If it says "Spark", you **must** upgrade to "Blaze".
3.  Click "Modify plan" and select the Blaze plan. You will need to associate a billing account.

**Note:** The Blaze plan has a generous free tier. You are unlikely to incur costs for a small development project. This step is mandatory for storage uploads to work.

---

### Step 2: Verify Required APIs are Enabled

The web upload functionality depends on specific Google Cloud APIs being active.

1.  Go to the [Google Cloud API Library](https://console.cloud.google.com/apis/library?project=studio-6220967431-56fe2).
2.  Search for **"Cloud Storage"**. If it is not enabled, click **Enable**.
3.  Search for **"Firebase Storage API"**. If it is not enabled, click **Enable**.

---

### Step 3: Set the CORS Policy (Visual Guide)

This is the most common point of failure. Follow these steps exactly.

1.  **[Click here to go to the Google Cloud Storage browser](https://console.cloud.google.com/storage/browser?project=studio-6220967431-56fe2)**. (Ensure your project is still selected at the top).

2.  You will see a table listing your storage buckets. In the **"Name"** column, click the blue link for your bucket. It will be named `studio-6220967431-56fe2.appspot.com`.

3.  Click the **"Permissions"** tab.

4.  Scroll down to the **Cross-origin resource sharing (CORS)** section and click **"Edit"**.

5.  **Delete any existing entries.** Then, click **"Add an entry"** and fill in the fields *exactly* as shown below:

    *   **Origins:**
        *   `http://localhost:3000`
        *   `https://studio--studio-6220967431-56fe2.us-central1.hosted.app`
    *   **Methods:**
        *   `GET`
        *   `PUT`
        *   `POST`
        *   `DELETE`
    *   **Response headers:**
        *   `Content-Type`
        *   `x-goog-resumable`
    *   **Max age:**
        *   `3600`

    Your final configuration should look like this:
    ![Correct CORS Configuration](https://i.postimg.cc/kXG2bVjB/cors-final-config.png)

6.  Click the **"Save"** button.

---

### Alternative Method: Using the Command Line (gsutil)

If you have tried the visual editor and are still having issues, this command-line method is faster and less prone to typos.

1.  **Open Google Cloud Shell:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Make sure your project **`studio-6220967431-56fe2`** is selected.
    *   Click the **"Activate Cloud Shell"** button in the top-right corner of the header. It looks like a `>_` icon. This will open a terminal at the bottom of your browser window.

    ![Activate Cloud Shell](https://cloud.google.com/shell/docs/images/cloud-shell-icon.png)

2.  **Navigate to Your Project Directory (Crucial Step):**
    *   The "No such file or directory" error means the `gsutil` command cannot find `cors.json`. This is because the terminal starts in a different folder from your project code.
    *   Your project files are located in the editor. To run the command, you need to use the terminal panel within your development environment, not a separate Cloud Shell window.

3.  **Run the CORS Command in the Correct Terminal:**
    *   Inside your development environment, open a terminal panel (you may see a "+" icon or a "Terminal" menu).
    *   This terminal should already be in your project's root directory (where `cors.json` is).
    *   Copy and paste the following single command into this terminal and press Enter.

    ```bash
    gsutil cors set cors.json gs://studio-6220967431-56fe2.appspot.com
    ```
    **Important Note:** It's a common point of confusion, but the command above is correct. Even if you see other URLs for your bucket, `gsutil` and Firebase Storage Rules use the `[PROJECT-ID].appspot.com` format as the official identifier for your default storage bucket. Please use the command exactly as written.

4.  **Wait and Refresh:**
    *   After the command finishes, wait about 1-2 minutes for the settings to apply.
    *   Refresh your application and try uploading a photo again. The upload should now succeed.

---

### Important Final Check

It's very common for a small typo to cause this issue. Please **double-check** that the "Origins" you entered into the Google Cloud Console match these values *exactly*:

*   `http://localhost:3000`
*   `https://studio--studio-6220967431-56fe2.us-central1.hosted.app`

Even a small difference, like a missing `http://` or a trailing slash `/`, can cause the upload to fail.
