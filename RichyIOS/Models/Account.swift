import Foundation

/// `users/{uid}` - the account document, READ shape only for now.
///
/// Since the document split (FIRESTORE_SPLIT.md) transactions live in the
/// `users/{uid}/tx/{id}` subcollection once `txSchema == 2`; until an account
/// has been moved (the web app moves it on its next open) they are still the
/// `tx` array here, and this app must not write transactions for it. Every
/// other field is written only through field-level `update()` - never a
/// whole-document `set()`. Every array defaults to empty and every setting is
/// optional so accounts from any era decode. Savings, business, investing,
/// debt, note and trip arrays arrive with their features.
struct Account: Decodable, Equatable, Sendable {
    /// 1 (or absent): transactions are the `tx` array below. 2: they are the
    /// `tx` subcollection and the array is gone.
    let txSchema: Int
    var isTransactionsSplit: Bool { txSchema >= 2 }

    let email: String?
    let dob: String?
    let handle: String?
    let lang: String?
    let currency: String?
    let theme: String?
    let darkMode: Bool
    let onboardingDone: Bool
    let catchUpDone: Bool
    let plan: String?
    let richardInstructions: String?
    let tx: [Transaction]
    let budgets: [Budget]
    let goals: [Goal]
    let categories: [Category]
    let folders: [Folder]

    var currencySymbol: String { currency ?? "$" }
    var richyTheme: RichyTheme { RichyTheme(rawValue: theme ?? "") ?? .standard }

    enum CodingKeys: String, CodingKey {
        case email, dob, handle, lang, currency, theme, darkMode, onboardingDone, catchUpDone
        case plan, richardInstructions, tx, budgets, goals, categories, folders
    }

    init(email: String? = nil,
         currency: String? = "$",
         onboardingDone: Bool = true,
         tx: [Transaction] = [],
         budgets: [Budget] = [],
         goals: [Goal] = [],
         categories: [Category] = [],
         folders: [Folder] = []) {
        self.email = email
        self.dob = nil
        self.handle = nil
        self.lang = nil
        self.currency = currency
        self.theme = nil
        self.darkMode = false
        self.onboardingDone = onboardingDone
        self.catchUpDone = true
        self.plan = nil
        self.richardInstructions = nil
        self.tx = tx
        self.budgets = budgets
        self.goals = goals
        self.categories = categories
        self.folders = folders
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        dob = try container.decodeIfPresent(String.self, forKey: .dob)
        handle = try container.decodeIfPresent(String.self, forKey: .handle)
        lang = try container.decodeIfPresent(String.self, forKey: .lang)
        currency = try container.decodeIfPresent(String.self, forKey: .currency)
        theme = try container.decodeIfPresent(String.self, forKey: .theme)
        darkMode = try container.decodeIfPresent(Bool.self, forKey: .darkMode) ?? false
        onboardingDone = try container.decodeIfPresent(Bool.self, forKey: .onboardingDone) ?? false
        catchUpDone = try container.decodeIfPresent(Bool.self, forKey: .catchUpDone) ?? false
        plan = try container.decodeIfPresent(String.self, forKey: .plan)
        richardInstructions = try container.decodeIfPresent(String.self, forKey: .richardInstructions)
        tx = container.decodeLossyArray(Transaction.self, forKey: .tx)
        budgets = container.decodeLossyArray(Budget.self, forKey: .budgets)
        goals = container.decodeLossyArray(Goal.self, forKey: .goals)
        categories = container.decodeLossyArray(Category.self, forKey: .categories)
        folders = container.decodeLossyArray(Folder.self, forKey: .folders)
    }
}
