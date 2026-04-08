
# The Definitive Firebase Storage Troubleshooting Guide

If you are seeing errors like `net::ERR_FAILED` or a `CORS policy` violation in your browser console when trying to upload photos, it means there is a configuration problem with your Google Cloud project. This is the most common and frustrating setup issue.

This guide provides a definitive checklist to solve it. **Please follow these steps in order.** The problem is NOT in the application's code.

---

### Critical: Select the Correct Project

This is the most important step. Before proceeding, ensure you have the correct project selected in the Google Cloud Console.

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  At the top of the page, click the project selector dropdown.
3.  Find and select your project: **`studio-6220967431-56fe2`**.

---

### Step 1: Verify Billing Plan

Firebase Storage requires your project to be on the **Blaze (Pay-as-you-go)** plan to function correctly with web applications. The free "Spark" plan has limitations that cause these errors, even if your CORS settings are correct.

1.  Go to the [Firebase Console Billing Page](https://console.firebase.google.com/project/studio-6220967431-56fe2/usage/details).
2.  Check your current plan. If it says "Spark", you **must** upgrade to "Blaze".
3.  Click "Modify plan" and select the Blaze plan. You will need to associate a billing account.

**Note:** The Blaze plan has a generous free tier. You are unlikely to incur costs for a small development project. **This step is mandatory for storage uploads from the web.**

---

### Step 2: Verify Required APIs are Enabled

The web upload functionality depends on two specific Google Cloud APIs being active.

1.  Go to the [Google Cloud API Library](https://console.cloud.google.com/apis/library?project=studio-6220967431-56fe2).
2.  Search for **"Cloud Storage"**. If it is not enabled, click **Enable**. Wait a minute for the setting to apply.
3.  Search for **"Firebase Storage API"**. If it is not enabled, click **Enable**. Wait a minute for the setting to apply.

---

### Step 3: Apply CORS Policy via Command Line (The Key Step)

The final and most crucial step is to apply the correct CORS (Cross-Origin Resource Sharing) settings to your storage bucket. The `cors.json` file in your project is already configured correctly for you. You just need to apply it.

**Important: Where to Run the Command**

You must run the following command in the **terminal panel within your development environment**, not the standalone Google Cloud Shell.

**The Command**

1.  **Open the terminal** in your development environment (you may see a "+" icon or a "Terminal" menu).
2.  **Copy and paste** the following command and press Enter. This is the modern, recommended command.

    ```bash
    gcloud storage buckets update gs://studio-6220967431-56fe2.appspot.com --cors-file=cors.json
    ```

3.  **Authorize if prompted.** The first time you run this, you may be asked to authorize the Google Cloud SDK. Follow the on-screen prompts.
4.  **Verification (Optional but Recommended):** After running the command, you can verify it was applied by running:
    ```bash
    gcloud storage buckets describe gs://studio-6220967431-56fe2.appspot.com --format="json(cors)"
    ```
    The output should match the contents of your `cors.json` file.

**Alternative `gsutil` Command**

If you prefer `gsutil` or if `gcloud` gives you trouble, you can use this command instead. It performs the same action.

```bash
gsutil cors set cors.json gs://studio-6220967431-56fe2.appspot.com
```

### Step 4: Final Check

After the `gcloud` command succeeds, **wait about 2-3 minutes** for the settings to apply across Google's infrastructure. Then, do a **hard refresh** of your application in the browser (Ctrl+Shift+R or Cmd+Shift+R) and try uploading a photo again. The upload should now succeed.
