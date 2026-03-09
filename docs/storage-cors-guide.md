# How to Fix Firebase Storage CORS Policy (Visual Guide)

The error `Firebase Storage: Max retry time for operation exceeded...` almost always indicates that a Cross-Origin Resource Sharing (CORS) policy issue is preventing your web application from uploading photos to Firebase Storage. This is a standard browser security feature.

This guide provides a straightforward, visual method using the Google Cloud Console website, which is more reliable than the command-line tools.

---

### Prerequisite: Enable Firebase Storage

Before you can apply a CORS policy, the Storage bucket must exist. This is the most likely cause of a "bucket not found" error.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project: **studio-6220967431-56fe2**.
3.  In the left-hand menu, find the **Build** section and click on **Storage**.
4.  Click the **"Get started"** button.
5.  Follow the on-screen prompts to set up your default Storage bucket. You can accept the default settings for the security rules and location.

Once you see the Storage dashboard with "Upload file" and "Create folder" buttons, your bucket has been created, and you can proceed.

---

### Step 1: Go to Google Cloud Storage

1.  **[Click here to go to the Google Cloud Storage browser](https://console.cloud.google.com/storage/browser)**.

2.  At the top of the page, ensure your project **studio-6220967431-56fe2** is selected. If not, click the project dropdown and select it.

### Step 2: Select Your Bucket

In the list of storage buckets, click on the one named **`studio-6220967431-56fe2.appspot.com`**.

### Step 3: Go to CORS Configuration

1.  Click the **Permissions** tab.
2.  Scroll down to the **Cross-origin resource sharing (CORS)** section.
3.  Click the **Edit** button.

### Step 4: Add CORS Entries

You will now add the necessary permissions.

1.  Click **"Add an entry"**.

2.  In the **Origins** field, type `http://localhost:3000` and press Enter.

3.  Type `https://studio-6220967431-56fe2.web.app` and press Enter.

4.  Type `https://studio-6220967431-56fe2.firebaseapp.com` and press Enter.

5.  In the **Methods** dropdown, select `GET`, `PUT`, `POST`, and `DELETE`.

6.  In the **Response headers** field, type `Content-Type` and press Enter. Then, type `x-goog-resumable` and press Enter.

7.  In the **Max age** field, enter `3600`.

8.  Click the **Save** button.

It might take a minute or two for the settings to apply. Once saved, photo uploads from your application should now work correctly, both on your local machine and when deployed.

---

## Alternative Method: Using the Command Line

This method is for users comfortable with the command line. If the visual guide above worked, you do not need to do this.

The `gsutil` tool is part of the Google Cloud CLI. If you don't already have it installed, follow the official instructions to [install the gcloud CLI](https://cloud.google.com/sdk/docs/install).

#### 1. Authenticate and Set Project

Open a terminal on your **local computer** and run the following commands:

```bash
# Log in to your Google account
gcloud auth login

# Set the active project (THIS IS A CRUCIAL STEP)
gcloud config set project studio-6220967431-56fe2
```

#### 2. Apply the CORS Policy

In the same terminal, navigate to your project's root directory. For example: `cd C:\Users\YourName\Downloads\my-testify-app`.

Then, run the `gsutil` command:

```bash
gsutil cors set cors.json gs://studio-6220967431-56fe2.appspot.com
```
