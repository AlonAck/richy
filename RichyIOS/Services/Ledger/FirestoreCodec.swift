import Foundation
import FirebaseFirestore

/// Between Firestore's `[String: Any]` and the app's models. Numbers arrive as
/// `NSNumber` (ints and doubles alike), ids may be numbers or strings, and the
/// web app writes plain JSON - so the account document is decoded by turning
/// it back into JSON and reusing the `Account` decoder, and a transaction is
/// mapped by hand so a single odd field never drops the record.
enum FirestoreCodec {
    /// The web app's `TX_SCHEMA_SPLIT`.
    static let splitSchema = 2

    static func schema(of data: [String: Any]) -> Int {
        looseInt(data["txSchema"]) ?? 1
    }

    // MARK: Account

    static func account(from data: [String: Any]) throws -> Account {
        let safe = jsonSafe(data)
        let json = try JSONSerialization.data(withJSONObject: safe, options: [])
        return try JSONDecoder().decode(Account.self, from: json)
    }

    /// Firestore values that JSONSerialization cannot take (timestamps, refs)
    /// become strings; everything the web app writes passes through unchanged.
    static func jsonSafe(_ value: Any) -> Any {
        switch value {
        case let dictionary as [String: Any]:
            var out: [String: Any] = [:]
            for (key, inner) in dictionary { out[key] = jsonSafe(inner) }
            return out
        case let array as [Any]:
            return array.map { jsonSafe($0) }
        case is String, is NSNumber, is NSNull:
            return value
        case let timestamp as Timestamp:
            return ISO8601DateFormatter().string(from: timestamp.dateValue())
        case let date as Date:
            return ISO8601DateFormatter().string(from: date)
        default:
            return String(describing: value)
        }
    }

    // MARK: Transactions

    static func transaction(from data: [String: Any]) -> Transaction? {
        guard let id = looseInt(data["id"]) else { return nil }
        let type = TransactionType(rawValue: data["type"] as? String ?? "") ?? .unknown
        return Transaction(id: id,
                           type: type,
                           amount: double(data["amount"]) ?? 0,
                           label: data["label"] as? String ?? "",
                           catId: looseString(data["catId"]) ?? "",
                           category: data["category"] as? String,
                           date: data["date"] as? String ?? "",
                           repeatRule: data["repeat"] as? String,
                           pending: bool(data["pending"]),
                           shared: bool(data["shared"]),
                           owner: looseString(data["owner"]),
                           opening: bool(data["opening"]),
                           transfer: bool(data["transfer"]),
                           trip: bool(data["trip"]),
                           catchUp: bool(data["catchUp"]),
                           synced: bool(data["synced"]))
    }

    /// The document the web app would write for the same record: the same
    /// keys, flags only when set, `repeat` defaulting to "none".
    static func data(for transaction: Transaction) -> [String: Any] {
        var out: [String: Any] = [
            "id": transaction.id,
            "type": transaction.type == .unknown ? "expense" : transaction.type.rawValue,
            "amount": transaction.amount,
            "label": transaction.label,
            "catId": transaction.catId,
            "date": transaction.date,
            "repeat": transaction.repeatRule ?? "none",
            "pending": transaction.pending
        ]
        if let category = transaction.category { out["category"] = category }
        if let owner = transaction.owner { out["owner"] = owner }
        if transaction.shared { out["shared"] = true }
        if transaction.opening { out["opening"] = true }
        if transaction.transfer { out["transfer"] = true }
        if transaction.trip { out["trip"] = true }
        if transaction.catchUp { out["catchUp"] = true }
        if transaction.synced { out["synced"] = true }
        return out
    }

    // MARK: A new account

    /// The web app's `TERMS_VERSION` at the time of writing.
    static let termsVersion = "2026-08-26"

    /// The document the web's sign-up writes (`finishSignup`), minus the `tx`
    /// array: a phone-created account starts on schema 2 with an empty
    /// subcollection. Same default folders and categories, same synced tags,
    /// same consent fields.
    static func newAccountDocument(_ draft: AccountDraft, now: Date = Date()) -> [String: Any] {
        var out: [String: Any] = [
            "txSchema": splitSchema,
            "budgets": [],
            "goals": [],
            "notes": [],
            "folders": defaultFolders,
            "categories": defaultCategories,
            "displayName": draft.displayName,
            "dob": draft.dob,
            "lang": draft.lang,
            "currency": draft.currency,
            "richardNotes": draft.richardNotes,
            "consentAt": Int(now.timeIntervalSince1970 * 1000),
            "termsVersion": termsVersion
        ]
        if let email = draft.email { out["email"] = email }
        return out
    }

    /// `DEFAULT_FOLDERS` + `SYNCED_TAG_FOLDER`, verbatim.
    static let defaultFolders: [[String: Any]] = [
        ["id": "f1", "name": "Essentials", "color": "#2799C8", "icon": "home"],
        ["id": "f2", "name": "Lifestyle", "color": "#AF52DE", "icon": "star"],
        ["id": "f3", "name": "Income & Wealth", "color": "#27A85F", "icon": "coins"],
        ["id": "f-wealth", "name": "Business, Investing & Savings", "color": "#C8983A", "icon": "briefcase",
         "rule": ["kind": "accounts", "accounts": ["business", "investing", "savings"]], "locked": true]
    ]

    /// `DEFAULT_CATEGORIES` + `SYNCED_TAGS`, verbatim.
    static let defaultCategories: [[String: Any]] = [
        ["id": "c1", "name": "Housing", "color": "#8B6CEF", "icon": "home", "folderId": "f1"],
        ["id": "c2", "name": "Food", "color": "#27A85F", "icon": "food", "folderId": "f1"],
        ["id": "c3", "name": "Transport", "color": "#D97941", "icon": "car", "folderId": "f1"],
        ["id": "c4", "name": "Health", "color": "#E0556E", "icon": "heart", "folderId": "f1"],
        ["id": "c5", "name": "Entertainment", "color": "#2799C8", "icon": "film", "folderId": "f2"],
        ["id": "c6", "name": "Shopping", "color": "#AF52DE", "icon": "cart", "folderId": "f2"],
        ["id": "c8", "name": "Salary", "color": "#27A85F", "icon": "briefcase", "folderId": "f3"],
        ["id": "c9", "name": "Investments", "color": "#C8983A", "icon": "chart", "folderId": "f3"],
        ["id": "c10", "name": "Savings", "color": "#C8673A", "icon": "coins", "folderId": "f3"],
        ["id": "c11", "name": "Other", "color": "#6B5C4E", "icon": "box", "folderId": "f2"],
        ["id": "tag-business", "name": "Business", "color": "#C8673A", "icon": "briefcase", "folderId": "f-wealth", "synced": "business"],
        ["id": "tag-investing", "name": "Investment", "color": "#C8983A", "icon": "chart", "folderId": "f-wealth", "synced": "investing"],
        ["id": "tag-savings", "name": "Savings", "color": "#8970C6", "icon": "coins", "folderId": "f-wealth", "synced": "savings"]
    ]

    // MARK: Budgets and goals

    /// The web's budget object. `dir` is written explicitly so switching a
    /// target back to a cap sticks; the other keys only when set.
    static func data(for budget: Budget) -> [String: Any] {
        var out: [String: Any] = [
            "catId": budget.catId,
            "limit": budget.limit,
            "dir": budget.isTarget ? "target" : "cap"
        ]
        if let category = budget.category { out["category"] = category }
        if let mode = budget.mode { out["mode"] = mode }
        if let folderId = budget.folderId { out["folderId"] = folderId }
        if let track = budget.track { out["track"] = track }
        return out
    }

    /// The web's goal object; an empty deadline is stored as "" as the web does.
    static func data(for goal: Goal) -> [String: Any] {
        var out: [String: Any] = [
            "id": goal.id,
            "name": goal.name,
            "target": goal.target,
            "saved": goal.saved,
            "deadline": goal.deadline ?? ""
        ]
        if let linkType = goal.linkType { out["linkType"] = linkType }
        if let linkId = goal.linkId { out["linkId"] = linkId }
        return out
    }

    // MARK: Loose scalars

    static func looseInt(_ value: Any?) -> Int? {
        if let number = value as? NSNumber { return number.intValue }
        if let string = value as? String, let int = Int(string) { return int }
        if let string = value as? String, let double = Double(string) { return Int(double) }
        return nil
    }

    static func looseString(_ value: Any?) -> String? {
        if let string = value as? String { return string }
        if let number = value as? NSNumber { return number.stringValue }
        return nil
    }

    static func double(_ value: Any?) -> Double? {
        if let number = value as? NSNumber { return number.doubleValue }
        if let string = value as? String { return Double(string) }
        return nil
    }

    static func bool(_ value: Any?) -> Bool {
        if let flag = value as? Bool { return flag }
        if let number = value as? NSNumber { return number.boolValue }
        return false
    }
}
