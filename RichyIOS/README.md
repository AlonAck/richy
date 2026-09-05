# Richy for iOS — native SwiftUI

The native iPhone client for Richy. Real SwiftUI, no WebView. It signs in to
the **same Firebase project and the same accounts** as the web app at
richy-mgkl.vercel.app, reads and writes the **same Firestore documents**, and
calls the **same Vercel API**; nothing about the backend is duplicated here.

This folder is written on Windows and **compiled on every push** by
`.github/workflows/ios-build.yml` on a GitHub-hosted macOS runner (Xcode
16.4, iOS Simulator). The verdict and every error line land as a comment on
the repo's "iOS build log" issue, so a red build is visible without a Mac.
What CI cannot do is run the app: that still takes the Mac checklist below.

## What is here

| Folder | Contents |
| --- | --- |
| `App/` | `RichyApp` entry point, `AppState` (session phase), `AppServices` (wiring), `RootView`, `MainTabView` (the web app's five tabs) |
| `Features/Home/` | `DashboardView`: current balance, this month in/out/net, where the money went, latest activity |
| `Features/Transactions/` | `ActivityView` (newest first, grouped by day, swipe to delete, tap to edit), `TransactionFormView` (add/edit), `TransactionRow` |
| `Features/Budgets/`, `Features/Goals/` | Live numbers; add, edit and delete caps, targets and goals from the phone (`BudgetFormView`, `GoalFormView`), written as field-level edits of the account document after a fresh read |
| `Features/Ledger/` | `LedgerStore` (one live subscription per session, shared by every tab) and `LedgerMath` (the dashboard arithmetic, ported from the web) |
| `Features/Richard/` | `RichardChatView` + view model: your messages as bubbles, Richard's as text, suggestion chips, the AI disclosure first, a report control on every reply; `RichardPrompt` builds the system prompt from the live ledger on every send |
| `Features/Auth/`, `Boot/`, `Profile/` | Sign in / sign up / reset with email; Continue with Google (Firebase's web flow, no extra SDK) and Continue with Apple (`SocialSignInButtons`); boot and not-configured screens; profile with sign out and delete account |
| `Components/` | `LoadingView`, `ErrorView`, `EmptyStateView`, `AsyncContentView`, buttons, card, text field, logo |
| `Models/` | Codable models for the account document: `Transaction`, `Budget`, `Goal`, `Category`, `Folder`, `Account`, chat types |
| `Services/Ledger/` | `LedgerService` protocol; `FirestoreLedgerService` (live listeners on `users/{uid}` and `users/{uid}/tx`, one document per write, and the one-time account move from the web app's `migrateTx`); `MockLedgerService` (in-memory, with sample data) |
| `Services/` | `APIClient` (actor, async/await), `AuthService` (Firebase + mock), `ChatService`, `AccountService`, `FirebaseBootstrap` |
| `DesignSystem/` | Colours (light/dark pairs from the web palette), typography, spacing, radii, category icons |
| `Utilities/` | `KeychainStore`, `Loadable`, `Money`, `RichyDate` (the web's UTC day and month keys), `Log`, `UserFacingError` |
| `Richy.xcodeproj` | The Xcode project, committed. Xcode 16 format: each folder above is a synchronised folder, so new files are picked up without touching the project. Packages: FirebaseCore, FirebaseAuth, FirebaseFirestore |
| `project.yml` | The same project as an XcodeGen spec — only a fallback for regenerating `Richy.xcodeproj`, see below |

Deliberately **not** here yet: saved chat history, the web's ten-step
onboarding questionnaire and Richard's first plan (an account created on
the phone gets it the first time it opens the web), savings pots, business,
investing, trips, households, Bank Sync.

### Accounts created from the phone

Sign-up with email writes `users/{uid}` right after the login is created,
with the fields the web's sign-up writes (name, date of birth, currency,
language, consent time, terms version, the default folders and categories),
on schema 2 from the start. A first Google or Apple sign-in has no document
yet, so `AccountSetupView` collects the same answers and writes it. Both
apply the 16+ gate the web applies (`RichyDate.age`), and both record the
AI consent in the same `consentAt` field.

### How the data flows

`users/{uid}` is read with a live listener and decoded into `Account`.
Transactions live in the `users/{uid}/tx/{id}` subcollection once an account
is on `txSchema: 2` (FIRESTORE_SPLIT.md); on every launch the app first runs
the same move the web app runs, so an account that has only ever used the
phone moves too. Adding, editing or deleting a transaction writes exactly
one document, so the phone and the web can edit at the same time without
overwriting each other. Budgets and goals are arrays on the account
document; an edit re-reads the document inside a transaction, changes one
entry and writes back only that array, keeping any key this app does not
know about.

### Google and Apple sign-in

Both come back into the app through a custom URL scheme that depends on the
Firebase file, so a build phase ("Register sign-in URL scheme") reads
`REVERSED_CLIENT_ID` and `GOOGLE_APP_ID` from `Resources/GoogleService-Info.plist`
and writes the schemes into the built `Info.plist`. Nothing to configure by
hand; without the file the phase does nothing and email sign-in still works.
Google uses Firebase's own web flow on the Firebase auth domain, which is
already an authorised domain, so the same Google accounts as the web sign
in. Apple needs the **Sign in with Apple** capability on the App ID, which
automatic signing adds from `Richy.entitlements` once a paid team is
selected; on a personal team the Apple button shows but the sheet fails.

## Before the Mac session — things only the account owner can do

1. Firebase console → project **richy-91667** → the iOS app **`com.richy.app`**
   is already registered → Project settings → Your apps → download
   **`GoogleService-Info.plist`**.
2. Put that file at `RichyIOS/Resources/GoogleService-Info.plist`. It is
   gitignored on purpose (repo convention for anything Firebase issues).
3. Firebase console → Authentication → *Sign-in method* → confirm
   **Email/Password** is enabled (it is, for the web app).

## Mac checklist — nothing to install except Xcode

Requirements: a Mac with **Xcode 16.4 or newer** from the App Store
(Firebase 12.15+ needs Swift tools 6.1). No Homebrew, no XcodeGen, no other
tools: `Richy.xcodeproj` is committed and opens directly.

1. Check Xcode is installed and new enough:

   ```bash
   xcodebuild -version
   ```

   "command not found" means Xcode is not installed: App Store → Xcode, then
   open it once so it can finish installing its components.

2. Get the code and open the project (the repo is public, no sign-in):

   ```bash
   cd ~ && git clone https://github.com/AlonAck/richy.git && open richy/RichyIOS/Richy.xcodeproj
   ```

   Already cloned? `cd ~/richy && git pull && open RichyIOS/Richy.xcodeproj`

3. Xcode resolves `firebase-ios-sdk` on first open — a few minutes, progress
   in the bar at the top of the window. Wait for it to finish.
4. Select the **Richy** project in the sidebar → target **Richy** → *Signing
   & Capabilities* → *Team* → pick your team. A personal team is enough for
   the simulator and your own iPhone.
5. Pick an iPhone simulator in the toolbar → **⌘B**. This is the first real
   compile. A first-build error is expected to be small and local — a symbol
   name, an availability annotation, a missing import. Fix it in place, or
   send the error text back.
6. **⌘R without** `GoogleService-Info.plist` → the app shows *"Richy isn't
   connected to Firebase yet"* and offers demo mode: sample data, every
   screen works, nothing is saved. Open any file with a `#Preview` → the
   canvas renders.
7. Put `GoogleService-Info.plist` into `RichyIOS/Resources/` in Finder — the
   project watches that folder, there is no Xcode step — then **⌘R** →
   welcome screen → sign in with a **test account, never a real user's** →
   the Dashboard shows that account's balance and month; Activity lists its
   transactions.
8. **The parity test.** Add a transaction on the phone → open the same
   account on the web → it is there within seconds. Edit or delete one on
   the web → the phone updates by itself. If the test account had never
   moved to schema 2, the phone moves it on first sign-in; the web then
   reads the subcollection like any other account.
9. Sign out → cold start renders the shell instantly from the Keychain,
   then settles.

**Delete account** on Profile calls the real `/api/delete-account` and is
irreversible. Only exercise it against a throwaway account created for the
purpose.

### Older Xcode or older macOS

Xcode 16.4 needs macOS 15.3 (Sequoia) or newer; a Mac that cannot go past
macOS 14 (Sonoma) tops out at Xcode 16.2. Xcode 16.0–16.3 opens the project
but cannot resolve Firebase 12.15+. In
Xcode: select the project → *Package Dependencies* → `firebase-ios-sdk` →
*Dependency Rule: Exact Version* → `12.14.0` (if that still fails to
resolve, `11.15.0`). Xcode 15 cannot open the project format at all — update
Xcode, or regenerate an older-format project with XcodeGen below.

### If Xcode refuses the project file

Regenerate it from `project.yml` with XcodeGen. This needs no Homebrew: the
release zip runs in place.

```bash
cd ~/richy/RichyIOS && curl -L https://github.com/yonaskolb/XcodeGen/releases/latest/download/xcodegen.zip -o /tmp/xcodegen.zip && unzip -q -o /tmp/xcodegen.zip -d /tmp && /tmp/xcodegen/bin/xcodegen generate && open Richy.xcodeproj
```

This overwrites `Richy.xcodeproj` and writes `Info.plist` (gitignored). If
the regenerated project is the one that built, commit it. `project.yml`
lists FirebaseFirestore alongside FirebaseAuth; keep it that way.

### If the build fails

Nothing here was compiled before the Mac session, so a first-build error is
expected to be small and local: a symbol name, an availability annotation, a
missing import. Fix it in place and note it in the commit message — the
Windows side cannot see the compiler. One known risk: this module defines
its own `Transaction` type, which shadows SwiftUI's and Firestore's; if the
compiler reports an ambiguous `Transaction`, qualify the app's as
`Richy.Transaction` at that spot.

## Architecture in one paragraph

Views never talk to Firebase or HTTP directly. `AppServices` holds one
instance of each service behind a protocol (`AuthService`, `ChatService`,
`AccountService`, `LedgerService`, `TokenProvider`); the real implementations
wrap the Firebase SDK and `APIClient`, the mocks are in-memory. `AppState`
follows the auth service's `AsyncStream` of users and switches the root
screen; `LedgerStore` follows the ledger service's streams and feeds every
tab. Feature views are `@Observable` `@MainActor` state plus SwiftUI, created
from the environment's services, so every screen previews with mocks and
nothing in a preview touches the network.
