import Foundation

enum TransactionType: String, Codable, Equatable, Sendable {
    case expense
    case income
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = TransactionType(rawValue: raw) ?? .unknown
    }
}

/// One ledger entry from `users/{uid}.tx[]`. Field names are the web app's,
/// verbatim, so both clients read the same document. Only `id` is required;
/// everything else defaults, because records from every era of the app exist.
struct Transaction: Codable, Identifiable, Equatable, Sendable {
    let id: Int
    let type: TransactionType
    let amount: Double
    let label: String
    let catId: String
    let category: String?
    /// "YYYY-MM-DD", as stored. Local-vs-UTC semantics are decided once in the
    /// Domain port, not here (see the migration plan, risk "dates").
    let date: String
    let repeatRule: String?
    let pending: Bool
    let shared: Bool
    let owner: String?
    let opening: Bool
    let transfer: Bool
    let trip: Bool

    var isExpense: Bool { type == .expense }
    var signedAmount: Double { type == .income ? amount : -amount }

    enum CodingKeys: String, CodingKey {
        case id, type, amount, label, catId, category, date
        case repeatRule = "repeat"
        case pending, shared, owner, opening, transfer, trip
    }

    init(id: Int,
         type: TransactionType,
         amount: Double,
         label: String,
         catId: String,
         category: String? = nil,
         date: String,
         repeatRule: String? = nil,
         pending: Bool = false,
         shared: Bool = false,
         owner: String? = nil,
         opening: Bool = false,
         transfer: Bool = false,
         trip: Bool = false) {
        self.id = id
        self.type = type
        self.amount = amount
        self.label = label
        self.catId = catId
        self.category = category
        self.date = date
        self.repeatRule = repeatRule
        self.pending = pending
        self.shared = shared
        self.owner = owner
        self.opening = opening
        self.transfer = transfer
        self.trip = trip
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let id = container.decodeLooseInt(forKey: .id) else {
            throw DecodingError.dataCorruptedError(forKey: .id, in: container,
                                                   debugDescription: "Transaction id is missing or not numeric.")
        }
        self.id = id
        type = try container.decodeIfPresent(TransactionType.self, forKey: .type) ?? .unknown
        amount = try container.decodeIfPresent(Double.self, forKey: .amount) ?? 0
        label = try container.decodeIfPresent(String.self, forKey: .label) ?? ""
        catId = container.decodeLooseString(forKey: .catId) ?? ""
        category = try container.decodeIfPresent(String.self, forKey: .category)
        date = try container.decodeIfPresent(String.self, forKey: .date) ?? ""
        repeatRule = try container.decodeIfPresent(String.self, forKey: .repeatRule)
        pending = try container.decodeIfPresent(Bool.self, forKey: .pending) ?? false
        shared = try container.decodeIfPresent(Bool.self, forKey: .shared) ?? false
        owner = container.decodeLooseString(forKey: .owner)
        opening = try container.decodeIfPresent(Bool.self, forKey: .opening) ?? false
        transfer = try container.decodeIfPresent(Bool.self, forKey: .transfer) ?? false
        trip = try container.decodeIfPresent(Bool.self, forKey: .trip) ?? false
    }
}
