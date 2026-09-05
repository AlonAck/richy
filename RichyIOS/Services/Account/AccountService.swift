import Foundation

enum AccountDeletionResult: Equatable, Sendable {
    case complete
    /// The server removed what it could and named what it could not. The
    /// person must be told, and pointed at support - never told "done".
    case partial(failed: [String], message: String)
}

/// Account-level operations. Deletion goes through `POST /api/delete-account`
/// and nowhere else: `handles/{handle}` cannot be deleted by any client, so a
/// client-side cleanup would always be incomplete.
protocol AccountService: Sendable {
    func deleteAccount() async throws -> AccountDeletionResult
}

final class RichyAccountService: AccountService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func deleteAccount() async throws -> AccountDeletionResult {
        let (data, response) = try await client.sendData(.post("/api/delete-account", timeout: 90))
        if response.statusCode == 207 {
            let envelope = try? JSONDecoder().decode(ServerErrorEnvelope.self, from: data)
            return .partial(failed: envelope?.failed ?? [],
                            message: envelope?.message ?? ServerErrorEnvelope.fallbackMessage)
        }
        return .complete
    }
}

final class MockAccountService: AccountService {
    func deleteAccount() async throws -> AccountDeletionResult {
        try await Task.sleep(nanoseconds: 500_000_000)
        return .complete
    }
}
