# Richy admin — reset all users

`reset-users.js` **permanently deletes** every Firebase Auth account **and** every
document in the Firestore `users` collection for project `richy-91667`.
Everyone starts from zero. **This cannot be undone.** Take a Firestore export
first if you might want the data back.

It will not run without `--yes`, so you can't trigger it by accident.

## Easiest: Google Cloud Shell (no install, no key file)

Cloud Shell is already signed in as you, so the script authenticates with zero setup.

1. Open https://console.cloud.google.com/ and pick project **richy-91667**
   (top-left project selector).
2. Click the **Activate Cloud Shell** icon (`>_`) in the top-right toolbar.
3. In the shell, create the script and install the SDK:
   ```
   mkdir reset && cd reset
   npm init -y
   npm install firebase-admin
   ```
   Then open the editor (`cloudshell edit reset-users.js`) and paste in the
   contents of this folder's `reset-users.js`, or upload the file via the
   shell's three-dot menu > **Upload**.
4. Run it:
   ```
   node reset-users.js --yes
   ```

## Alternative: run locally

Requires Node installed (it isn't on this machine yet — get it at https://nodejs.org).

1. Firebase Console > Project settings > **Service accounts** > **Generate new
   private key**. Save the downloaded file as `service-account.json` in this
   `admin/` folder. **Never commit it** — `.gitignore` already excludes it.
2. From this folder:
   ```
   npm install
   set GOOGLE_APPLICATION_CREDENTIALS=service-account.json   (PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS="service-account.json")
   node reset-users.js --yes
   ```

## What it does

- Deletes all docs in the `users` collection (batched, 400 at a time).
- Deletes all Auth accounts (paged, up to 1000 per delete call).
- Prints running counts and a final total.
