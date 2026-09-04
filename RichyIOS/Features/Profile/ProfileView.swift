import SwiftUI

/// Who is signed in, the legal links, sign out, and full account deletion
/// through the existing `/api/delete-account` route (App Store 5.1.1(v)).
struct ProfileView: View {
    let user: AuthUser
    @State private var model: ProfileViewModel
    @Environment(AppState.self) private var appState

    @State private var showDeleteConfirm = false
    @State private var partialMessage: String?
    @State private var failureMessage: String?

    init(user: AuthUser, account: any AccountService) {
        self.user = user
        _model = State(initialValue: ProfileViewModel(account: account))
    }

    private var displayName: String {
        if let name = user.displayName, !name.isEmpty { return name }
        if let email = user.email, let at = email.firstIndex(of: "@") { return String(email[..<at]) }
        return "You"
    }

    private var providerLabel: String {
        switch user.provider {
        case .password: return "Email and password"
        case .google: return "Google"
        case .apple: return "Apple"
        case .demo: return "Demo"
        case .unknown: return "Unknown"
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: Spacing.md) {
                        Text(String(displayName.prefix(1)).uppercased())
                            .font(RichyFont.display(RichyFont.Size.headline))
                            .foregroundStyle(Color.white)
                            .frame(width: 44, height: 44)
                            .background(RichyColor.accent, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(displayName)
                                .font(RichyFont.ui(RichyFont.Size.headline, weight: .semibold))
                                .foregroundStyle(RichyColor.ink)
                            Text(user.email ?? "No email on file")
                                .font(RichyFont.ui(RichyFont.Size.subhead))
                                .foregroundStyle(RichyColor.ink3)
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                }
                .listRowBackground(RichyColor.card)

                Section("Account") {
                    LabeledContent("Signed in with", value: providerLabel)
                    LabeledContent("Email verified", value: user.isEmailVerified ? "Yes" : "Not yet")
                }
                .listRowBackground(RichyColor.card)

                Section("Legal") {
                    Link(destination: URL(string: "https://richy-mgkl.vercel.app/terms.html")!) {
                        Label("Terms of use", systemImage: "doc.text")
                    }
                    Link(destination: URL(string: "https://richy-mgkl.vercel.app/privacy.html")!) {
                        Label("Privacy policy", systemImage: "hand.raised")
                    }
                }
                .listRowBackground(RichyColor.card)

                Section {
                    Button {
                        appState.signOut()
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
                .listRowBackground(RichyColor.card)

                Section {
                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        HStack {
                            Label("Delete account and data", systemImage: "trash")
                            if model.isDeleting {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }
                    .disabled(model.isDeleting)
                } footer: {
                    Text("Deletes your account, your data and your sign-in on every device. This cannot be undone.")
                }
                .listRowBackground(RichyColor.card)
            }
            .scrollContentBackground(.hidden)
            .background(RichyColor.background)
            .tint(RichyColor.accent)
            .navigationTitle("Profile")
            .confirmationDialog("Delete your account?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete everything", role: .destructive) {
                    Task { await deleteAccount() }
                }
                Button("Keep my account", role: .cancel) {}
            } message: {
                Text("Your transactions, budgets, goals and chats are erased and your sign-in is removed. There is no undo.")
            }
            .alert("Some data could not be removed", isPresented: isPresented($partialMessage)) {
                Button("OK") { appState.accountDeleted() }
            } message: {
                Text(partialMessage ?? "")
            }
            .alert("Couldn't delete your account", isPresented: isPresented($failureMessage)) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(failureMessage ?? "")
            }
        }
    }

    private func deleteAccount() async {
        switch await model.deleteAccount() {
        case .deleted:
            appState.accountDeleted()
        case .partial(let message):
            partialMessage = message
        case .failed(let message):
            failureMessage = message
        }
    }

    /// An alert binding driven by an optional message: shown while non-nil,
    /// cleared when dismissed.
    private func isPresented(_ message: Binding<String?>) -> Binding<Bool> {
        Binding(get: { message.wrappedValue != nil },
                set: { if !$0 { message.wrappedValue = nil } })
    }
}

#Preview("Profile") {
    ProfileView(user: MockAuthService.demoUser, account: MockAccountService())
        .environment(AppState(services: .mock()))
}
