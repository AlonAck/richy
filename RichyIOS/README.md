# Richy for iOS — native SwiftUI

The native iPhone client for Richy. Real SwiftUI, no WebView. It signs in to
the **same Firebase project and the same accounts** as the web app at
richy-mgkl.vercel.app and calls the **same Vercel API**; nothing about the
backend is duplicated here.

This folder was written on Windows. **It has not been compiled yet.** The
first build happens in Xcode on the Mac using the checklist below — until
that has run, treat "it compiles" as unverified.

## What is here (the foundation)

| Folder | Contents |
| --- | --- |
| `App/` | `RichyApp` entry point, `AppState` (session phase), `AppServices` (wiring), `RootView`, `MainTabView` |
| `Features/` | `Auth` (sign in / sign up / reset), `Boot`, `Home` and `Richard` placeholders, `Profile` (sign out, delete account) |
| `Components/` | `LoadingView`, `ErrorView`, `EmptyStateView`, `AsyncContentView`, buttons, card, text field, logo |
| `Models/` | Codable models for the account document: `Transaction`, `Budget`, `Goal`, `Category`, `Folder`, `Account`, chat types |
| `Services/` | `APIClient` (actor, async/await), `AuthService` (Firebase + mock), `ChatService`, `AccountService`, `FirebaseBootstrap` |
| `DesignSystem/` | Colours (light/dark pairs from the web palette), typography, spacing, radii |
| `Utilities/` | `KeychainStore`, `Loadable`, `Money`, `Log`, `UserFacingError` |
| `Richy.xcodeproj` | The Xcode project, committed. Xcode 16 format: each folder above is a synchronised folder, so new files are picked up without touching the project |
| `project.yml` | The same project as an XcodeGen spec — only a fallback for regenerating `Richy.xcodeproj`, see below |

Deliberately **not** here yet: Firestore reads/writes (the backend has to split
the single user document first — branch `firestore-split`), Sign in with
Apple / Google, the real dashboard, transactions, budgets, goals, Richard chat
UI.

## Before the Mac session — things only the account owner can do

1. Firebase console → project **richy-91667** → *Add app* → **iOS**, bundle id
   **`com.richy.app`** → download **`GoogleService-Info.plist`**.
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
   connected to Firebase yet"* and offers demo mode. Open any file with a
   `#Preview` → the canvas renders.
7. Put `GoogleService-Info.plist` into `RichyIOS/Resources/` in Finder — the
   project watches that folder, there is no Xcode step — then **⌘R** →
   welcome screen → sign in with a **test account, never a real user's** →
   tab shell → Profile shows the email → Sign out → cold start renders the
   shell instantly from the Keychain, then settles.

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
the regenerated project is the one that built, commit it.

### If the build fails

Nothing here was compiled before the Mac session, so a first-build error is
expected to be small and local: a symbol name, an availability annotation, a
missing import. Fix it in place and note it in the commit message — the
Windows side cannot see the compiler.

## Architecture in one paragraph

Views never talk to Firebase or HTTP directly. `AppServices` holds one
instance of each service behind a protocol (`AuthService`, `ChatService`,
`AccountService`, `TokenProvider`); the real implementations wrap the
Firebase SDK and `APIClient`, the mocks are in-memory. `AppState` follows the
auth service's `AsyncStream` of users and switches the root screen. Feature
view models are `@Observable` `@MainActor` classes created by their views
from the environment's services, so every screen previews with mocks and
nothing in a preview touches the network.
