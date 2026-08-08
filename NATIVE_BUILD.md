# Richy — Native App Store Build Guide

Everything below runs on a **Mac** (Xcode is macOS-only). The web app is already
production-ready; this guide wraps it in a native iOS shell with Capacitor and
walks the App Store submission. Budget ~1 day for the build + a few days for
Apple's review.

## 0. Prerequisites (one-time)

- macOS with **Xcode** installed (App Store → Xcode, ~1 hr download).
- **Node 20+**: `brew install node` (or nodejs.org installer).
- **Apple Developer Program** membership ($99/year): https://developer.apple.com/programs/
- This repo cloned: `git clone https://github.com/AlonAck/richy.git && cd richy`

## 1. Build the web bundle locally

```bash
npm install
npm run build        # writes public/ — the same output Vercel deploys
```

Sanity-check: `public/index.html` and `public/dist/app.js` exist.

## 2. Add Capacitor + the iOS project

`capacitor.config.json` is already committed (appId `com.richy.app`, webDir `public`).

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios     # opens the project in Xcode
```

## 3. Xcode configuration

In Xcode (App target → Signing & Capabilities / General):

1. **Team**: select your Apple Developer team; let Xcode manage signing.
2. **Bundle Identifier**: `com.richy.app` (must match an App ID you register).
3. **Display Name**: Richy. **Version**: 1.0.0, **Build**: 1.
4. **App icons**: use `icon-512.png` / `icon-180.png` from the repo root as the
   source. Easiest path: https://icon.kitchen or Xcode's single-size icon slot
   (Xcode 14+ accepts one 1024×1024 icon — upscale icon-512.png).
5. **Deployment target**: iOS 15.0 is a comfortable floor.

## 4. Native niceties worth adding (guideline 4.2 — minimum functionality)

A bare webview risks a 4.2 rejection. These are small and make the app feel
native; add at least the first two:

```bash
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/haptics @capacitor/local-notifications
npx cap sync ios
```

- **Splash screen**: mirrors the in-app `rc-splash` (dark `#0D0C18` logo tile on
  `#F7F3EE`).
- **Status bar**: match the app theme (style dark on cream, light on dark mode).
- **Local notifications**: wire the existing note reminders (`sw.js` handles the
  web path; on native, call `LocalNotifications.schedule` from the same place
  the app calls `registration.showNotification`).
- **Haptics**: tap feedback on the tab bar and Add button.

## 5. Test on a real device

- Plug in an iPhone, select it as the run target, hit Run.
- Test signup (consent checkbox + 16+ age gate), Richard chat, offline launch
  (airplane mode after first run), Hebrew/Arabic RTL, account deletion, export.

## 6. App Store Connect setup

Create the app at https://appstoreconnect.apple.com (My Apps → + → New App,
bundle ID `com.richy.app`).

**Required URLs** (already live):
- Privacy Policy URL: `https://richy-mgkl.vercel.app/privacy.html`
- Support URL: `https://richy-mgkl.vercel.app` (or a contact page)

**Category**: Finance. **Age rating**: answer the questionnaire honestly — no
objectionable content; unrestricted web access = NO (the app is not a browser);
result is typically 4+, and you may optionally restrict to 17+ if you prefer
given the finance context. Richy's own Terms set a 16+ minimum regardless.

**App Privacy (nutrition labels)** — declare exactly this, matching privacy.html:

| Data type | Collected? | Linked to user? | Tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → Email Address | Yes | Yes | No | App Functionality |
| Contact Info → Name | Yes | Yes | No | App Functionality |
| Sensitive Info → Date of Birth (Other User Content) | Yes | Yes | No | App Functionality (age verification) |
| Financial Info → Other Financial Info (transactions, budgets, holdings the user enters) | Yes | Yes | No | App Functionality |
| User Content → Other User Content (chat messages with Richard) | Yes | Yes | No | App Functionality |
| Identifiers / Location / Browsing History / Advertising Data | **No** | — | — | — |

"Data Used to Track You": **none**. No third-party advertising or analytics SDKs.

**Account deletion (guideline 5.1.1(v))**: in the review notes, point the
reviewer at Profile → Privacy & Data → Danger zone → "Delete account & data".
This deletes the database record, bank keys, and the sign-in account itself.

**Guideline 2.5.2 (no downloaded code)**: the app ships a fully precompiled
bundle (`public/dist/app.js` built by `build.mjs`); there is **no runtime
Babel/eval** in the native shell. If asked, note that `preview.html` (the dev
harness) is not part of the shipped webDir.

**Demo account for review**: create a real account with sample data and put its
email + password in the App Review notes, or tell the reviewer signup is open.
Note that "Connect Bank Leumi (Demo)" is clearly labeled a simulation and never
contacts a real bank.

## 7. Upload & submit

1. Xcode → Product → Archive.
2. Organizer window → Distribute App → App Store Connect → Upload.
3. In App Store Connect: attach the build, fill screenshots (6.7" and 5.5"
   sizes minimum — screenshot the app in Safari responsive mode or on device),
   description, keywords, and submit for review.

## 8. Android later (optional)

Same repo, same webDir: `npm install @capacitor/android && npx cap add android`,
open in Android Studio, sign, upload to Play Console. Google also requires the
privacy policy URL + a Data Safety form (mirror the table above) + an account
deletion URL (point at the same in-app flow; a web deletion page can be added
if Play requests one).

## Known gaps to close before/soon after launch

- Lawyer review of `terms.html` / `privacy.html` (drafts were written in-house).
- `richysupport@gmail.com` must exist and be monitored — it is printed in both
  legal documents and in the deletion fallback message.
- Push notifications on native require APNs (Capacitor Push Notifications
  plugin + a small server) — the current reminder system works only while the
  app is installed/open (local notifications).
