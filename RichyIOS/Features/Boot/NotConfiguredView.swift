import SwiftUI

/// Shown when the bundle has no GoogleService-Info.plist. Explains the fix and
/// the one thing that still breaks with the file in place (a bundle id that
/// does not match Firebase), and offers demo mode so the UI can be explored on
/// a simulator meanwhile.
struct NotConfiguredView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        ZStack {
            RichyColor.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    RichyLogoTile(size: 56)
                    Text("Richy isn't connected to Firebase yet")
                        .font(RichyFont.display(RichyFont.Size.title))
                        .foregroundStyle(RichyColor.ink)
                    Text("Sign-in and your data live in Firebase. This build has no configuration file, so there is nothing to sign in to.")
                        .font(RichyFont.ui(RichyFont.Size.body))
                        .foregroundStyle(RichyColor.ink2)
                    RichyCard {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            SetupStep(number: 1, text: "In the Firebase console, open project richy-91667 and add an iOS app with bundle id com.richy.app.")
                            SetupStep(number: 2, text: "Download GoogleService-Info.plist and put it in RichyIOS/Resources.")
                            SetupStep(number: 3, text: "Run xcodegen generate again, then build and run.")
                        }
                    }
                    Text("The bundle id in Xcode must match the one registered in Firebase, or sign-in will fail even with the file in place.")
                        .font(RichyFont.ui(RichyFont.Size.footnote))
                        .foregroundStyle(RichyColor.ink3)
                    Button("Explore in demo mode") {
                        appState.enterDemoMode()
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .padding(.top, Spacing.sm)
                    Text("Demo mode runs on in-memory services. Nothing is saved and Richard's replies are canned.")
                        .font(RichyFont.ui(RichyFont.Size.footnote))
                        .foregroundStyle(RichyColor.ink3)
                }
                .padding(Spacing.screen)
                .padding(.top, Spacing.xxl)
            }
        }
    }
}

private struct SetupStep: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Text("\(number)")
                .font(RichyFont.mono(RichyFont.Size.footnote, weight: .semibold))
                .foregroundStyle(RichyColor.accent)
                .frame(width: 22, height: 22)
                .background(RichyColor.accentDim, in: Circle())
            Text(text)
                .font(RichyFont.ui(RichyFont.Size.subhead))
                .foregroundStyle(RichyColor.ink)
        }
    }
}

#Preview("Not configured") {
    NotConfiguredView()
        .environment(AppState(services: .mock(mode: .notConfigured)))
}
