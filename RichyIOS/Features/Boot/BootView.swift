import SwiftUI

/// The launch splash, mirroring the web's `rc-splash`: the logo tile breathing
/// while the session is restored. Shown for as long as it takes Firebase to
/// answer, which on a warm device is a fraction of a second.
struct BootView: View {
    @State private var breathe = false

    var body: some View {
        ZStack {
            RichyColor.background.ignoresSafeArea()
            VStack(spacing: Spacing.lg) {
                RichyLogoTile(size: 64)
                    .scaleEffect(breathe ? 1.055 : 1)
                    .animation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true), value: breathe)
                Text("Richy")
                    .font(RichyFont.display(19))
                    .foregroundStyle(RichyColor.ink)
                ProgressView()
                    .tint(RichyColor.ink3)
            }
        }
        .onAppear { breathe = true }
    }
}

#Preview("Boot") {
    BootView()
}
