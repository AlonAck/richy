import SwiftUI

/// Stands in for the dashboard until the vertical slice lands. Reading the
/// account document is deliberately not built yet: the backend has to split
/// the single user document before two clients can share it safely.
struct HomePlaceholderView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                EmptyStateView(icon: "sparkles",
                               title: "Your dashboard is next",
                               message: "Balance, cash flow and Richard Watch arrive with the vertical slice, once the backend can serve the web app and this app at the same time.")
            }
            .navigationTitle("Dashboard")
        }
    }
}

#Preview("Dashboard placeholder") {
    HomePlaceholderView()
}
