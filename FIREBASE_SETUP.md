# Connect Richy to Firebase (one-time setup)

Richy now stores every user's data in **Cloud Firestore** and handles sign-in with
**Firebase Authentication**. Data is permanent, syncs across devices, and you can see
every user in the Firebase console. Do these steps once.

You do the clicking in the Firebase console (I can't create the account for you).
I've already written all the app code — you only paste your project's config.

---

## 1. Create the project
1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it (e.g. `richy`). You can disable Google Analytics. Create.

## 2. Register a Web app + copy the config
1. On the project home, click the **`</>`** (Web) icon.
2. Nickname it `Richy web`, click **Register app**.
3. Firebase shows a `firebaseConfig = { ... }` object.
4. Open **`firebase-init.js`** in this project and paste each value over the
   `PASTE_...` placeholders (keep the quotes). Save.

## 3. Turn on Authentication
1. Left menu: **Build -> Authentication -> Get started**.
2. **Sign-in method** tab:
   - Enable **Email/Password**.
   - Enable **Google** (pick a support email), Save.

## 4. Create the database
1. Left menu: **Build -> Firestore Database -> Create database**.
2. Choose a location, start in **Production mode**.
3. Open the **Rules** tab, paste the contents of **`firestore.rules`** from this
   project, and click **Publish**.

## 5. Authorize your domains (for Google sign-in)
1. **Authentication -> Settings -> Authorized domains**.
2. `localhost` is already there (local testing works).
3. When you deploy, click **Add domain** and add your Vercel URL
   (e.g. `your-app.vercel.app`).

---

## That's it
- Reload Richy. Create an account or use Continue with Google.
- **See all users:** Firebase console -> Authentication (the user list) and
  Firestore Database -> `users` collection (each user's data document).
- Sign out / sign back in on any device -> the same data loads.

## Notes
- The keys in `firebase-init.js` are **not secrets** - they only identify your
  project to the browser. Your data is protected by the rules in `firestore.rules`.
  It's fine to commit both files.
- Old local test accounts (from the previous localStorage version) are not carried
  over - create fresh accounts on the new cloud version.
