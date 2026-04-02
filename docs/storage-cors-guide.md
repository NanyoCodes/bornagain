
# How to Fix Firebase Storage Uploads (Troubleshooting Guide)

If you are seeing errors like `net::ERR_FAILED` or `CORS policy` in your browser console when trying to upload photos, it means there is a configuration problem with your Google Cloud project. This guide provides a definitive checklist to solve it.

**The problem is NOT in the application's code. You must complete these steps in the Google Cloud Console and your development terminal.**

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

### Step 3: Apply CORS Policy via Command Line (Most Reliable Method)

The final and most crucial step is to apply the correct CORS (Cross-Origin Resource Sharing) settings to your storage bucket. The `cors.json` file in your project is already configured correctly for you. You just need to apply it.

**Important: Where to Run the Command**

You must run the following command in the **terminal panel within your development environment**, not the standalone Google Cloud Shell.

If you received a "No such file or directory" error, it's because you were in the wrong terminal. Use the integrated terminal where your project files are listed.

**The Command**

1.  **Open the terminal** in your development environment (you may see a "+" icon or a "Terminal" menu).
2.  **Copy and paste** the following command and press Enter. This is the modern, recommended command.

    ```bash
    gcloud storage buckets update gs://studio-6220967431-56fe2.appspot.com --cors-file=cors.json
    ```

3.  **Authorize if prompted.** The first time you run this, you may be asked to authorize the Google Cloud SDK. Follow the on-screen prompts.

**Alternative `gsutil` Command**

If you prefer `gsutil`, you can use this command instead. It performs the same action.

```bash
gsutil cors set cors.json gs://studio-6220967431-56fe2.appspot.com
```

### Important Final Check

After the command succeeds, wait about 1-2 minutes for the settings to apply. Then, refresh your application and try uploading a photo again. The upload should now succeed.

It's very common for a small typo to cause this issue. Please **double-check** that the "Origins" you entered into the Google Cloud Console match these values *exactly*:

*   `http://localhost:3000`
*   `https://studio--studio-6220967431-56fe2.us-central1.hosted.app`
*   `https://6000-firebase-studio-1771339890236.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev`

Even a small difference, like a missing `http://` or a trailing slash `/`, can cause the upload to fail.
