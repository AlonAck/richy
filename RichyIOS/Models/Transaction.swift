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

/// One ledger entry: a document in `users/{uid}/tx/{id}` once an account has
/// moved to schema 2, or an element of the `tx` array before that. Field names
/// are the web app's, verbatim, so both clients read the same record. Only `id`
/// is required; everything else defaults, because records from every era of
/// the app exist.
struct Transaction: Codable, Identifiable, Equatable, Sendable {
    let id: Int
    let type: TransactionType
    let amount: Double
    let label: String
    let catId: String
    let category: String?
    /// "YYYY-MM-DD", as stored. See `RichyDate` for the clock it is read with.
    let date: String
    let repeatRule: String?
    let pending: Bool
    let shared: Bool
    let owner: String?
    let opening: Bool
    let transfer: Bool
    let trip: Bool
    /// Written by the catch-up flow for months entered in bulk; the web app
    /// leaves these out of the balance.
    let catchUp: Bool
    /// Arrived through Bank Sync rather than by hand.
    let synced: Bool

    var isExpense: Bool { type == .expense }
    var isIncome: Bool { type == .income }
    var signedAmount: Double { type == .income ? amount : -amount }

    /// The web app's `isOpening(t)`.
    var isOpening: Bool { opening || catId == "opening" || category == "Opening balance" }
    /// The web app's `isTransfer(t)`.
    var isTransfer: Bool { transfer || catId == "savings-transfer" }

    /// The web app's `isSettled(t)`: not pending and not dated in the future.
    func isSettled(today: String) -> Bool { !pending && date <= today }

    enum CodingKeys: String, CodingKey {
        case id, type, amount, label, catId, category, date
        case repeatRule = "repeat"
        case pending, shared, owner, opening, transfer, trip, catchUp, synced
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
         trip: Bool = false,
         catchUp: Bool = false,
         synced: Bool = false) {
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
        self.catchUp = catchUp
        self.synced = synced
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
        catchUp = try container.decodeIfPresent(Bool.self, forKey: .catchUp) ?? false
        synced = try container.decodeIfPresent(Bool.self, forKey: .synced) ?? false
    }

    /// The same record with the fields a person can edit replaced.
    func edited(type: TransactionType,
                amount: Double,
                label: String,
                catId: String,
                category: String?,
                date: String,
                pending: Bool) -> Transaction {
        Transaction(id: id, type: type, amount: amount, label: label, catId: catId, category: category, date: date,
                    repeatRule: repeatRule, pending: pending, shared: shared, owner: owner, opening: opening,
                    transfer: transfer, trip: trip, catchUp: catchUp, synced: synced)
    }
}
