import Foundation
import Observation
import SwiftUI

/// The signed-in account's data, live, shared by every tab. Created once per
/// session by `MainTabView`, started when the shell appears and stopped when
/// it goes. Screens read `account` and `transactions` and call the three
/// write methods; Firestore's listeners echo each write back within a frame,
/// so there is no local copy to keep in step.
@MainActor
@Observable
final class LedgerStore {
    enum Phase: Equatable {
        case loading
        case ready
        /// Signed in, but `users/{uid}` does not exist yet: a first sign-in
        /// from the phone. `AccountSetupView` collects what the web's sign-up
        /// would have, then `createAccount` writes the document.
        case needsSetup
        case failed(String)
    }

    let uid: String
    private(set) var phase: Phase = .loading
    private(set) var account: Account?
    /// Newest first.
    private(set) var transactions: [Transaction] = []
    /// The last write that failed, for the screen to show. Cleared on the next success.
    var writeError: String?

    private let ledger: any LedgerService
    private var accountTask: Task<Void, Never>?
    private var transactionsTask: Task<Void, Never>?
    private var hasAccount = false
    private var hasTransactions = false

    init(uid: String, ledger: any LedgerService) {
        self.uid = uid
        self.ledger = ledger
    }

    var categories: [Category] { account?.categories ?? [] }
    var folders: [Folder] { account?.folders ?? [] }
    var currency: String { account?.currencySymbol ?? "$" }
    var isEmpty: Bool { transactions.isEmpty }

    /// Idempotent: subscribes once. Call again after `stop()` to resubscribe.
    func start() {
        guard accountTask == nil, transactionsTask == nil else { return }
        phase = .loading
        hasAccount = false
        hasTransactions = false
        let ledger = self.ledger
        let uid = self.uid

        accountTask = Task { [weak self] in
            do {
                for try await account in ledger.accountUpdates(uid: uid) {
                    guard let self else { return }
                    self.account = account
                    self.hasAccount = true
                    self.settle()
                }
            } catch {
                self?.fail(error)
            }
        }

        transactionsTask = Task { [weak self] in
            do {
                try await ledger.prepareTransactions(uid: uid)
                for try await records in ledger.transactionUpdates(uid: uid) {
                    guard let self else { return }
                    self.transactions = LedgerMath.sortedNewestFirst(records)
                    self.hasTransactions = true
                    self.settle()
                }
            } catch {
                self?.fail(error)
            }
        }
    }

    func stop() {
        accountTask?.cancel()
        transactionsTask?.cancel()
        accountTask = nil
        transactionsTask = nil
    }

    func retry() {
        stop()
        start()
    }

    // MARK: Writes

    @discardableResult
    func add(_ draft: TransactionDraft) async -> Bool {
        await perform { _ = try await self.ledger.add(draft, uid: self.uid) }
    }

    @discardableResult
    func update(_ transaction: Transaction) async -> Bool {
        await perform { try await self.ledger.update(transaction, uid: self.uid) }
    }

    @discardableResult
    func delete(_ transaction: Transaction) async -> Bool {
        await perform { try await self.ledger.delete(transaction, uid: self.uid) }
    }

    @discardableResult
    func saveBudget(_ budget: Budget) async -> Bool {
        await perform { try await self.ledger.saveBudget(budget, uid: self.uid) }
    }

    @discardableResult
    func deleteBudget(catId: String) async -> Bool {
        await perform { try await self.ledger.deleteBudget(catId: catId, uid: self.uid) }
    }

    @discardableResult
    func saveGoal(_ goal: Goal) async -> Bool {
        await perform { try await self.ledger.saveGoal(goal, uid: self.uid) }
    }

    @discardableResult
    func deleteGoal(id: Int) async -> Bool {
        await perform { try await self.ledger.deleteGoal(id: id, uid: self.uid) }
    }

    /// The alert binding every screen uses for a failed write: shown while a
    /// message is set, cleared when dismissed.
    var writeErrorShown: Binding<Bool> {
        Binding(get: { self.writeError != nil },
                set: { if !$0 { self.writeError = nil } })
    }

    private func perform(_ work: () async throws -> Void) async -> Bool {
        guard phase == .ready else {
            writeError = "Your data is still loading. Try again in a moment."
            return false
        }
        do {
            try await work()
            writeError = nil
            return true
        } catch {
            writeError = UserFacingError.message(for: error)
            Log.app.error("Ledger write failed")
            return false
        }
    }

    private func settle() {
        if hasAccount && hasTransactions {
            phase = .ready
        }
    }

    /// Writes the account document for a first sign-in from the phone, then
    /// resubscribes so the tabs load it.
    func createAccount(_ draft: AccountDraft) async -> Bool {
        do {
            try await ledger.createAccount(draft, uid: uid)
            writeError = nil
            retry()
            return true
        } catch {
            writeError = UserFacingError.message(for: error)
            Log.app.error("Account creation failed")
            return false
        }
    }

    private func fail(_ error: Error) {
        if error is CancellationError { return }
        if case .needsSetup = phase { return }
        if LedgerError(error) == .noAccount {
            phase = .needsSetup
            return
        }
        phase = .failed(UserFacingError.message(for: error))
        Log.app.error("Ledger stream failed")
    }
}
