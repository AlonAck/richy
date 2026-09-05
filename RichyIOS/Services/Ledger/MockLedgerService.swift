import Foundation

/// An in-memory ledger for previews and demo mode: a plausible account with a
/// few weeks of activity, and writes that show up straight away. Nothing here
/// touches the network.
final class MockLedgerService: LedgerService, @unchecked Sendable {
    private let lock = NSLock()
    private var account: Account
    private var transactions: [Transaction]
    private var continuations: [UUID: AsyncThrowingStream<[Transaction], Error>.Continuation] = [:]

    init(account: Account = MockLedgerService.sampleAccount, transactions: [Transaction] = MockLedgerService.sampleTransactions()) {
        self.account = account
        self.transactions = transactions
    }

    func accountUpdates(uid: String) -> AsyncThrowingStream<Account, Error> {
        let current = snapshotAccount()
        return AsyncThrowingStream { continuation in
            continuation.yield(current)
        }
    }

    func transactionUpdates(uid: String) -> AsyncThrowingStream<[Transaction], Error> {
        AsyncThrowingStream { continuation in
            let id = UUID()
            lock.lock()
            continuations[id] = continuation
            let current = transactions
            lock.unlock()
            continuation.yield(current)
            continuation.onTermination = { [weak self] _ in
                guard let self else { return }
                self.lock.lock()
                self.continuations[id] = nil
                self.lock.unlock()
            }
        }
    }

    func prepareTransactions(uid: String) async throws {
        try await Task.sleep(nanoseconds: 200_000_000)
    }

    func add(_ draft: TransactionDraft, uid: String) async throws -> Transaction {
        let record = draft.record()
        mutate { $0.append(record) }
        return record
    }

    func update(_ transaction: Transaction, uid: String) async throws {
        mutate { list in
            if let index = list.firstIndex(where: { $0.id == transaction.id }) {
                list[index] = transaction
            } else {
                list.append(transaction)
            }
        }
    }

    func delete(_ transaction: Transaction, uid: String) async throws {
        mutate { list in list.removeAll { $0.id == transaction.id } }
    }

    private func snapshotAccount() -> Account {
        lock.lock()
        defer { lock.unlock() }
        return account
    }

    private func mutate(_ change: (inout [Transaction]) -> Void) {
        lock.lock()
        change(&transactions)
        let current = transactions
        let listeners = Array(continuations.values)
        lock.unlock()
        for continuation in listeners {
            continuation.yield(current)
        }
    }

    // MARK: Sample data

    static let sampleCategories: [Category] = [
        Category(id: "c1", name: "Housing", color: "#8B6CEF", icon: "home", folderId: "f1"),
        Category(id: "c2", name: "Food", color: "#27A85F", icon: "food", folderId: "f1"),
        Category(id: "c3", name: "Transport", color: "#D97941", icon: "car", folderId: "f1"),
        Category(id: "c4", name: "Health", color: "#E0556E", icon: "heart", folderId: "f1"),
        Category(id: "c5", name: "Entertainment", color: "#2799C8", icon: "film", folderId: "f2"),
        Category(id: "c6", name: "Shopping", color: "#AF52DE", icon: "cart", folderId: "f2"),
        Category(id: "c8", name: "Salary", color: "#27A85F", icon: "briefcase", folderId: "f3"),
        Category(id: "c9", name: "Investments", color: "#C8983A", icon: "chart", folderId: "f3"),
        Category(id: "c10", name: "Savings", color: "#C8673A", icon: "coins", folderId: "f3"),
        Category(id: "c11", name: "Other", color: "#6B5C4E", icon: "box", folderId: "f2")
    ]

    static let sampleFolders: [Folder] = [
        Folder(id: "f1", name: "Essentials", role: "need"),
        Folder(id: "f2", name: "Lifestyle", role: "want"),
        Folder(id: "f3", name: "Income & Wealth", role: "savings")
    ]

    static let sampleAccount = Account(email: "demo@richy.app",
                                       currency: "$",
                                       onboardingDone: true,
                                       tx: [],
                                       budgets: [
                                           Budget(catId: "c2", category: "Food", limit: 600, dir: "cap"),
                                           Budget(catId: "c5", category: "Entertainment", limit: 150, dir: "cap"),
                                           Budget(catId: "c10", category: "Savings", limit: 400, dir: "target")
                                       ],
                                       goals: [
                                           Goal(id: 1, name: "Emergency fund", target: 5000, saved: 2150, deadline: "2027-03-01"),
                                           Goal(id: 2, name: "Trip to Lisbon", target: 1800, saved: 400)
                                       ],
                                       categories: sampleCategories,
                                       folders: sampleFolders)

    static func sampleTransactions(now: Date = Date()) -> [Transaction] {
        let calendar = Calendar(identifier: .gregorian)
        func day(_ offset: Int) -> String {
            RichyDate.string(from: calendar.date(byAdding: .day, value: -offset, to: now) ?? now)
        }
        let base = RichyDate.newId(now) - 100_000
        var out: [Transaction] = []
        func add(_ type: TransactionType, _ amount: Double, _ label: String, _ catId: String, _ category: String, daysAgo: Int, pending: Bool = false) {
            out.append(Transaction(id: base + out.count, type: type, amount: amount, label: label, catId: catId,
                                   category: category, date: day(daysAgo), repeatRule: "none", pending: pending))
        }
        add(.income, 4200, "Salary", "c8", "Salary", daysAgo: 4)
        add(.expense, 1450, "Rent", "c1", "Housing", daysAgo: 3)
        add(.expense, 86.4, "Groceries", "c2", "Food", daysAgo: 2)
        add(.expense, 12.5, "Coffee with Dana", "c2", "Food", daysAgo: 1)
        add(.expense, 54, "Fuel", "c3", "Transport", daysAgo: 1)
        add(.expense, 39.9, "Streaming bundle", "c5", "Entertainment", daysAgo: 0)
        add(.expense, 120, "Running shoes", "c6", "Shopping", daysAgo: 0)
        add(.expense, 200, "Transfer to savings", "c10", "Savings", daysAgo: 6)
        add(.expense, 64, "Pharmacy", "c4", "Health", daysAgo: 9)
        add(.income, 4200, "Salary", "c8", "Salary", daysAgo: 34)
        add(.expense, 1450, "Rent", "c1", "Housing", daysAgo: 33)
        add(.expense, 310.2, "Groceries", "c2", "Food", daysAgo: 20)
        add(.expense, 45, "Dentist", "c4", "Health", daysAgo: -3, pending: true)
        return out
    }
}
