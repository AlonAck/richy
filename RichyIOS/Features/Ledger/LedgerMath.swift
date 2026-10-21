import Foundation

/// A month's income and spending.
struct MonthSummary: Equatable, Sendable {
    let month: String
    let income: Double
    let expenses: Double
    var net: Double { income - expenses }
}

/// Money in and money out over the app-wide period (see `RichyPeriod`).
struct PeriodSummary: Equatable, Sendable {
    let income: Double
    let expenses: Double
    let count: Int
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
    /// The web app's `balanceAt` for today: settled income minus settled
    /// expenses, with catch-up entries left out. Settled means not pending and
    /// not dated in the future. Once a bank statement has pinned the balance
    /// (the opening's `asOf`), the opening holds what the bank printed for the
    /// end of that day, so a record dated on or before it is already inside
    /// it and only later records move the balance.
    static func balance(_ transactions: [Transaction], today: String = RichyDate.today()) -> Double {
        let asOf = transactions.first(where: { $0.isOpening })?.asOf ?? ""
        var total = 0.0
        for record in transactions where !record.catchUp && !record.pending && !record.date.isEmpty {
            guard record.isIncome || record.isExpense else { continue }
            if !asOf.isEmpty && record.isOpening {
                total += record.signedAmount
                continue
            }
            if record.date <= today { total += record.signedAmount }
            if !asOf.isEmpty && record.date <= asOf { total -= record.signedAmount }
        }
        return round2(total)
    }

    /// Income and spending dated in `month`. Trip spending stays inside its
    /// own trip ledger on the web and is left out here too. A transfer - to or
    /// from a pot, or between the user's own bank accounts - is the user's own
    /// money changing place: neither spending nor income.
    static func monthSummary(_ transactions: [Transaction], month: String = RichyDate.currentMonth()) -> MonthSummary {
        var income = 0.0
        var expenses = 0.0
        for record in transactions where RichyDate.monthKey(of: record.date) == month && !record.pending && !record.catchUp {
            if record.isIncome && !record.isTransfer { income += record.amount }
            if record.isExpense && !record.trip && !record.isTransfer { expenses += record.amount }
        }
        return MonthSummary(month: month, income: round2(income), expenses: round2(expenses))
    }

    /// The web app's `spentInCat` for every category, largest first, zeros
    /// dropped. A record counts for a category by id, or by name for records
    /// written before ids existed.
    static func spendByCategory(_ transactions: [Transaction], categories: [Category], month: String = RichyDate.currentMonth()) -> [CategorySpend] {
        let inMonth = transactions.filter { $0.isExpense && !$0.trip && RichyDate.monthKey(of: $0.date) == month }
        return categorySpend(inMonth, categories: categories)
    }

    /// Expense rows already filtered to a window, totalled per category.
    private static func categorySpend(_ expenses: [Transaction], categories: [Category]) -> [CategorySpend] {
        var rows: [(Category, Double)] = []
        for category in categories {
            let spent = expenses
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
        return budgetRows(budgets, categories: categories, folders: folders, spend: spend) { $0.limit }
    }

    /// One row per budget, from spend already totalled per category, with
    /// the limit `limitFor` gives (the monthly one, or one scaled to a period).
    private static func budgetRows(_ budgets: [Budget],
                                   categories: [Category],
                                   folders: [Folder],
                                   spend: [CategorySpend],
                                   limitFor: (Budget) -> Double) -> [BudgetProgress] {
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
                                      limit: limitFor(budget),
                                      isTarget: isTarget)
            }
            let category = categories.first { $0.id == budget.catId }
                ?? categories.first { $0.name == budget.category }
            return BudgetProgress(budget: budget,
                                  name: category?.name ?? budget.category ?? "Budget",
                                  icon: category?.icon,
                                  colorHex: category?.color,
                                  spent: spentById[category?.id ?? budget.catId] ?? 0,
                                  limit: limitFor(budget),
                                  isTarget: isTarget)
        }
        .sorted { $0.fraction > $1.fraction }
    }


    // MARK: - The app-wide period (see RichyPeriod)

    /// The web's `periodFlow`: money in and money out over a period - the one
    /// sum the Dashboard, Activity and Budgets show, so no two screens can
    /// quote different totals for the same window. Opening balances, transfers
    /// and trip rows are not earning or spending; pending and future-dated
    /// rows have not happened yet. `count` is every non-transfer row inside.
    static func flow(_ transactions: [Transaction], in period: PeriodWindow, today: String = RichyDate.today()) -> PeriodSummary {
        var income = 0.0
        var expenses = 0.0
        var count = 0
        for record in transactions where period.contains(record.date) && !record.isTransfer {
            count += 1
            if record.pending || record.date > today { continue }
            if record.isIncome && !record.isOpening { income += record.amount }
            if record.isExpense && !record.trip { expenses += record.amount }
        }
        return PeriodSummary(income: round2(income), expenses: round2(expenses), count: count)
    }

    /// `spendByCategory` over a period instead of a month.
    static func spendByCategory(_ transactions: [Transaction], categories: [Category], in period: PeriodWindow) -> [CategorySpend] {
        let inPeriod = transactions.filter { $0.isExpense && !$0.trip && period.contains($0.date) }
        return categorySpend(inPeriod, categories: categories)
    }

    /// `budgets` over a period. A limit is MONTHLY, so it is scaled to the
    /// window (`months`): twelve caps for a year, about a quarter of one for a
    /// week - the web's `budgetPeriodLimit`. A budget tracking a live account
    /// balance is a level, not a flow, and never scales. `monthlyLimit` keeps
    /// the number the user set, for the edit form.
    static func budgets(_ budgets: [Budget],
                        categories: [Category],
                        folders: [Folder],
                        transactions: [Transaction],
                        in period: PeriodWindow) -> [BudgetProgress] {
        let spend = spendByCategory(transactions, categories: categories, in: period)
        return budgetRows(budgets, categories: categories, folders: folders, spend: spend) { budget in
            budget.track == "live" || period.months == 1 ? budget.limit : round2(budget.limit * period.months)
        }
    }
    /// The web app's `FOLDER_BUDGET_PREFIX`.
    static let folderBudgetPrefix = "folder:"

    /// The web app's `round2`.
    static func round2(_ value: Double) -> Double {
        (value * 100).rounded() / 100
    }
}
