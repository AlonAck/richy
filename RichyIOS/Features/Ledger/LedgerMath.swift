import Foundation

/// A month's income and spending.
struct MonthSummary: Equatable, Sendable {
    let month: String
    let income: Double
    let expenses: Double
    var net: Double { income - expenses }
}

/// What one category took this month, and its share of the month's spending.
struct CategorySpend: Identifiable, Equatable, Sendable {
    let category: Category
    let amount: Double
    let share: Double
    var id: String { category.id }
}

/// The transactions of one calendar day, newest first.
struct DaySection: Identifiable, Equatable, Sendable {
    let date: String
    let transactions: [Transaction]
    var id: String { date }
}

/// A budget with this month's number against it.
struct BudgetProgress: Identifiable, Equatable, Sendable {
    let budget: Budget
    let name: String
    let icon: String?
    let colorHex: String?
    let spent: Double
    let limit: Double
    let isTarget: Bool

    var id: String { budget.catId }
    var fraction: Double { limit > 0 ? min(spent / limit, 1) : 0 }
    /// Literally over a cap - what the web's header count says out loud.
    var isOver: Bool { !isTarget && limit > 0 && spent > limit }
    /// Off plan: over a cap, or behind a target.
    var isOff: Bool { limit > 0 && (isTarget ? spent < limit : spent > limit) }
}

/// The arithmetic behind the money screens, ported from the web app's
/// dashboard so both clients show the same numbers for the same records.
/// Pure functions over plain values; nothing here touches a service.
enum LedgerMath {
    /// The web app's `balance`: settled income minus settled expenses, with
    /// catch-up entries left out. Settled means not pending and not dated in
    /// the future.
    static func balance(_ transactions: [Transaction], today: String = RichyDate.today()) -> Double {
        var income = 0.0
        var expenses = 0.0
        for record in transactions where !record.catchUp && record.isSettled(today: today) {
            if record.isIncome { income += record.amount }
            if record.isExpense { expenses += record.amount }
        }
        return round2(income - expenses)
    }

    /// Income and spending dated in `month`. Trip spending stays inside its
    /// own trip ledger on the web and is left out here too; transfers between
    /// the user's own pots are not spending.
    static func monthSummary(_ transactions: [Transaction], month: String = RichyDate.currentMonth()) -> MonthSummary {
        var income = 0.0
        var expenses = 0.0
        for record in transactions where RichyDate.monthKey(of: record.date) == month && !record.pending && !record.catchUp {
            if record.isIncome { income += record.amount }
            if record.isExpense && !record.trip && !record.isTransfer { expenses += record.amount }
        }
        return MonthSummary(month: month, income: round2(income), expenses: round2(expenses))
    }

    /// The web app's `spentInCat` for every category, largest first, zeros
    /// dropped. A record counts for a category by id, or by name for records
    /// written before ids existed.
    static func spendByCategory(_ transactions: [Transaction], categories: [Category], month: String = RichyDate.currentMonth()) -> [CategorySpend] {
        let inMonth = transactions.filter { $0.isExpense && !$0.trip && RichyDate.monthKey(of: $0.date) == month }
        var rows: [(Category, Double)] = []
        for category in categories {
            let spent = inMonth
                .filter { $0.catId == category.id || $0.category == category.name }
                .reduce(0.0) { $0 + $1.amount }
            if spent > 0 { rows.append((category, round2(spent))) }
        }
        let total = rows.reduce(0.0) { $0 + $1.1 }
        return rows
            .sorted { $0.1 > $1.1 }
            .map { CategorySpend(category: $0.0, amount: $0.1, share: total > 0 ? $0.1 / total : 0) }
    }

    /// The category a record belongs to: by id, else by name.
    static func category(for record: Transaction, in categories: [Category]) -> Category? {
        if let byId = categories.first(where: { $0.id == record.catId }) { return byId }
        if let name = record.category { return categories.first(where: { $0.name == name }) }
        return nil
    }

    /// Newest first, grouped by day.
    static func sections(_ transactions: [Transaction]) -> [DaySection] {
        let sorted = sortedNewestFirst(transactions)
        var out: [DaySection] = []
        for record in sorted {
            if let last = out.last, last.date == record.date {
                out[out.count - 1] = DaySection(date: last.date, transactions: last.transactions + [record])
            } else {
                out.append(DaySection(date: record.date, transactions: [record]))
            }
        }
        return out
    }

    static func sortedNewestFirst(_ transactions: [Transaction]) -> [Transaction] {
        transactions.sorted { lhs, rhs in
            if lhs.date != rhs.date { return lhs.date > rhs.date }
            return lhs.id > rhs.id
        }
    }

    /// The web's dashboard rows: each budget against this month's spending in
    /// its category, or across a folder's categories. Sorted by how full.
    static func budgets(_ budgets: [Budget],
                        categories: [Category],
                        folders: [Folder],
                        transactions: [Transaction],
                        month: String = RichyDate.currentMonth()) -> [BudgetProgress] {
        let spend = spendByCategory(transactions, categories: categories, month: month)
        let spentById = Dictionary(spend.map { ($0.category.id, $0.amount) }, uniquingKeysWith: { first, _ in first })
        return budgets.map { budget -> BudgetProgress in
            let isTarget = budget.isTarget
            if budget.catId.hasPrefix(folderBudgetPrefix) {
                let folderId = budget.folderId ?? String(budget.catId.dropFirst(folderBudgetPrefix.count))
                let folder = folders.first { $0.id == folderId }
                let members = categories.filter { $0.folderId == folderId }
                let spent = members.reduce(0.0) { $0 + (spentById[$1.id] ?? 0) }
                return BudgetProgress(budget: budget,
                                      name: folder?.name ?? budget.category ?? "Folder",
                                      icon: "box",
                                      colorHex: folder?.color,
                                      spent: round2(spent),
                                      limit: budget.limit,
                                      isTarget: isTarget)
            }
            let category = categories.first { $0.id == budget.catId }
                ?? categories.first { $0.name == budget.category }
            return BudgetProgress(budget: budget,
                                  name: category?.name ?? budget.category ?? "Budget",
                                  icon: category?.icon,
                                  colorHex: category?.color,
                                  spent: spentById[category?.id ?? budget.catId] ?? 0,
                                  limit: budget.limit,
                                  isTarget: isTarget)
        }
        .sorted { $0.fraction > $1.fraction }
    }

    /// The web app's `FOLDER_BUDGET_PREFIX`.
    static let folderBudgetPrefix = "folder:"

    /// The web app's `round2`.
    static func round2(_ value: Double) -> Double {
        (value * 100).rounded() / 100
    }
}
