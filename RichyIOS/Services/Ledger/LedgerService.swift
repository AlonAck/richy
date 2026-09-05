import Foundation

/// A transaction before it has an id: what the add form produces.
struct TransactionDraft: Equatable, Sendable {
    var type: TransactionType = .expense
    var amount: Double = 0
    var label: String = ""
    var catId: String = ""
    var category: String = ""
    var date: String = RichyDate.today()
    var pending: Bool = false

    /// The stored record, with a fresh `Date.now()` id and the web app's
    /// defaults for everything the form does not ask about.
    func record(id: Int = RichyDate.newId()) -> Transaction {
        Transaction(id: id, type: type, amount: amount, label: label, catId: catId,
                    category: category.isEmpty ? nil : category, date: date, repeatRule: "none", pending: pending)
    }
}

enum LedgerError: LocalizedError, Equatable {
    /// The signed-in user has no `users/{uid}` document yet.
    case noAccount
    /// Firestore refused the read or write (rules, or a stale session).
    case permissionDenied
    /// No network, and nothing cached to fall back on.
    case offline
    case other(String)

    var errorDescription: String? {
        switch self {
        case .noAccount:
            return "This account has not been set up yet. Finish the first steps in Richy on the web, then come back."
        case .permissionDenied:
            return "Richy was not allowed to read your data. Sign out and back in; if that does not help, the server rules need updating."
        case .offline:
            return "You seem to be offline. Your data will load as soon as the connection is back."
        case .other(let message):
            return message
        }
    }

    init(_ error: Error) {
        if let ledger = error as? LedgerError {
            self = ledger
            return
        }
        let nsError = error as NSError
        // FirestoreErrorCode: 7 = permissionDenied, 14 = unavailable, 16 = unauthenticated.
        switch nsError.code {
        case 7, 16: self = .permissionDenied
        case 14: self = .offline
        default: self = .other(nsError.localizedDescription)
        }
    }
}

/// The account document and the transactions, live. `FirestoreLedgerService`
/// reads the real thing; `MockLedgerService` keeps everything in memory for
/// previews and demo mode. Views never see either directly - `LedgerStore`
/// owns the subscriptions.
protocol LedgerService: Sendable {
    /// The account document as it changes. Finishes with an error when the
    /// document cannot be read or does not exist.
    func accountUpdates(uid: String) -> AsyncThrowingStream<Account, Error>

    /// Every transaction, as the set changes. Call `prepareTransactions` once
    /// first: until an account is on schema 2 this stream is empty.
    func transactionUpdates(uid: String) -> AsyncThrowingStream<[Transaction], Error>

    /// Moves the account's transactions out of the document into the `tx`
    /// subcollection (FIRESTORE_SPLIT.md) when that has not happened yet. Safe
    /// to call on every launch; a no-op once the account is on schema 2.
    func prepareTransactions(uid: String) async throws

    func add(_ draft: TransactionDraft, uid: String) async throws -> Transaction
    func update(_ transaction: Transaction, uid: String) async throws
    func delete(_ transaction: Transaction, uid: String) async throws
}
