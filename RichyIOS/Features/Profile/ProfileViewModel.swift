import Foundation
import Observation

@MainActor
@Observable
final class ProfileViewModel {
    enum DeletionOutcome: Equatable {
        case deleted
        /// The server erased what it could; `message` names what it could not.
        case partial(String)
        case failed(String)
    }

    private(set) var isDeleting = false

    private let account: any AccountService

    init(account: any AccountService) {
        self.account = account
    }

    func deleteAccount() async -> DeletionOutcome {
        guard !isDeleting else { return .failed("Already deleting.") }
        isDeleting = true
        defer { isDeleting = false }
        do {
            switch try await account.deleteAccount() {
            case .complete:
                Log.app.info("Account deleted")
                return .deleted
            case .partial(let failed, let message):
                Log.app.error("Account deletion partial: \(failed.joined(separator: ","), privacy: .public)")
                let detail = failed.isEmpty ? message : message + " Not removed: " + failed.joined(separator: ", ") + "."
                return .partial(detail)
            }
        } catch {
            return .failed(UserFacingError.message(for: error))
        }
    }
}
