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

Deliberately **not** here yet: Firestore reads/writes (the backend has to split
the single user document first), Sign in with Apple / Google, the real
dashboard, transactions, budgets, goals, Richard chat UI.

## Before the Mac session — things only the account owner can do

1. Firebase console → project **richy-91667** → *Add app* → **iOS**, bundle id
   **`com.richy.app`** → download **`GoogleService-Info.plist`**.
2. Put that file at `RichyIOS/Resources/GoogleService-Info.plist`. It is
   gitignored on purpose (repo convention for anything Firebase issues).
3. Firebase console → Authentication → *Sign-in method* → confirm
   **Email/Password** is enabled (it is, for the web app).

## Mac checklist — from `git pull` to a running simulator

Requirements: **Xcode 16.4 or newer** (Firebase 12.15+ needs Swift tools 6.1),
Homebrew.

```bash
brew install xcodegen
cd RichyIOS
xcodegen generate        # writes Richy.xcodeproj and Info.plist (both gitignored)
open Richy.xcodeproj
```

In Xcode:

1. Wait for Swift Package Manager to resolve `firebase-ios-sdk` (first time:
   a few minutes).
2. Signing & Capabilities → pick your team. A personal team is enough for the
   simulator and your own device.
3. Select an iPhone simulator → **⌘B**. This is the first real compile.
4. **⌘R without** `GoogleService-Info.plist` → the app shows *"Richy isn't
   connected to Firebase yet"* and offers demo mode. Open any file with a
   `#Preview` → the canvas renders.
5. Add the plist, `xcodegen generate` again (so the file joins the target),
   **⌘R** → welcome screen → sign in with a **test account, never a real
   user's** → tab shell → Profile shows the email → Sign out → cold start
   renders the shell instantly from the Keychain, then settles.

**Delete account** on Profile calls the real `/api/delete-account` and is
irreversible. Only exercise it against a throwaway account created for the
purpose.

### If `xcodegen` is not an option

Xcode → *File → New → Project* → iOS App, SwiftUI, name `Richy`, bundle id
`com.richy.app`, minimum iOS 17. Delete the template `ContentView.swift` and
`RichyApp.swift`. Drag `App`, `Features`, `Components`, `Models`, `Services`,
`DesignSystem`, `Utilities` and `Resources/Assets.xcassets` into the project
as **groups** (copy items if needed: off). *File → Add Package Dependencies*
→ `https://github.com/firebase/firebase-ios-sdk` → add products
**FirebaseCore** and **FirebaseAuth** to the `Richy` target. In the target's
*Info* tab set the keys listed under `info.properties` in `project.yml`.

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
