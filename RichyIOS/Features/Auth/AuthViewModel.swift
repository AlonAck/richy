import Foundation
import Observation

/// Form state for sign-in, sign-up and reset. Success is not signalled from
/// here: the auth service's state stream tells `AppState`, which switches the
/// root screen. That keeps one source of truth for "who is signed in".
@MainActor
@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var confirmPassword = ""
    private(set) var isBusy = false
    private(set) var errorMessage: String?
    private(set) var infoMessage: String?

    private let auth: any AuthService

    init(auth: any AuthService) {
        self.auth = auth
    }

    var canSignIn: Bool { isEmailPlausible && !password.isEmpty && !isBusy }
    var canSignUp: Bool { isEmailPlausible && password.count >= 6 && password == confirmPassword && !isBusy }
    var canReset: Bool { isEmailPlausible && !isBusy }

    /// The web app's `isEmail()`: an "@" with something before it and a dot after it.
    private var isEmailPlausible: Bool {
        let trimmed = trimmedEmail
        guard trimmed.count >= 6, let at = trimmed.firstIndex(of: "@"), at != trimmed.startIndex else { return false }
        return trimmed[trimmed.index(after: at)...].contains(".")
    }

    private var trimmedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func signIn() async {
        await run {
            _ = try await self.auth.signIn(email: self.trimmedEmail, password: self.password)
        }
    }

    func signUp() async {
        guard password == confirmPassword else {
            errorMessage = "The two passwords don't match."
            return
        }
        await run {
            _ = try await self.auth.signUp(email: self.trimmedEmail, password: self.password)
        }
    }

    func sendReset() async {
        await run {
            try await self.auth.sendPasswordReset(email: self.trimmedEmail)
            self.infoMessage = "Check \(self.trimmedEmail) for a link to choose a new password."
        }
    }

    func clearMessages() {
        errorMessage = nil
        infoMessage = nil
    }

    private func run(_ work: () async throws -> Void) async {
        guard !isBusy else { return }
        isBusy = true
        errorMessage = nil
        infoMessage = nil
        defer { isBusy = false }
        do {
            try await work()
        } catch {
            errorMessage = UserFacingError.message(for: error)
        }
    }
}
