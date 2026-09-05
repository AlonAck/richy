import Foundation
import FirebaseFirestore

/// The live ledger: `users/{uid}` for the account document and
/// `users/{uid}/tx/{id}` for transactions, exactly the layout the web app
/// reads and writes (FIRESTORE_SPLIT.md). Every transaction write touches one
/// document, so this app and the web app can edit at the same time.
final class FirestoreLedgerService: LedgerService, @unchecked Sendable {
    /// The web app's `TX_BATCH_LIMIT`: Firestore allows 500 operations per batch.
    private static let batchLimit = 450

    private let db: Firestore

    init(db: Firestore = Firestore.firestore()) {
        self.db = db
    }

    // MARK: References

    private func userRef(_ uid: String) -> DocumentReference {
        db.collection("users").document(uid)
    }

    private func txCollection(_ uid: String) -> CollectionReference {
        userRef(uid).collection("tx")
    }

    /// The document for a record: its id as a string, the web's `txDoc`.
    private func txDoc(_ uid: String, key: String) -> DocumentReference {
        txCollection(uid).document(key)
    }

    // MARK: Streams

    func accountUpdates(uid: String) -> AsyncThrowingStream<Account, Error> {
        let ref = userRef(uid)
        return AsyncThrowingStream { continuation in
            let registration = ref.addSnapshotListener { snapshot, error in
                if let error {
                    continuation.finish(throwing: LedgerError(error))
                    return
                }
                guard let snapshot, snapshot.exists, let data = snapshot.data() else {
                    continuation.finish(throwing: LedgerError.noAccount)
                    return
                }
                do {
                    continuation.yield(try FirestoreCodec.account(from: data))
                } catch {
                    continuation.finish(throwing: LedgerError.other("Your account data could not be read on this version of the app."))
                }
            }
            continuation.onTermination = { _ in registration.remove() }
        }
    }

    func transactionUpdates(uid: String) -> AsyncThrowingStream<[Transaction], Error> {
        let collection = txCollection(uid)
        return AsyncThrowingStream { continuation in
            let registration = collection.addSnapshotListener { snapshot, error in
                if let error {
                    continuation.finish(throwing: LedgerError(error))
                    return
                }
                let records = (snapshot?.documents ?? []).compactMap { FirestoreCodec.transaction(from: $0.data()) }
                continuation.yield(records)
            }
            continuation.onTermination = { _ in registration.remove() }
        }
    }

    // MARK: Writes

    func add(_ draft: TransactionDraft, uid: String) async throws -> Transaction {
        let record = draft.record()
        try await write(record, uid: uid)
        return record
    }

    func update(_ transaction: Transaction, uid: String) async throws {
        try await write(transaction, uid: uid)
    }

    func delete(_ transaction: Transaction, uid: String) async throws {
        do {
            try await txDoc(uid, key: String(transaction.id)).delete()
        } catch {
            throw LedgerError(error)
        }
    }

    private func write(_ transaction: Transaction, uid: String) async throws {
        do {
            try await txDoc(uid, key: String(transaction.id)).setData(FirestoreCodec.data(for: transaction))
        } catch {
            throw LedgerError(error)
        }
    }

    // MARK: Budgets and goals

    func saveBudget(_ budget: Budget, uid: String) async throws {
        let fresh = FirestoreCodec.data(for: budget)
        try await editArray(uid: uid, field: "budgets") { entries in
            var next = entries
            if let index = next.firstIndex(where: { FirestoreCodec.looseString($0["catId"]) == budget.catId }) {
                next[index] = next[index].merging(fresh) { _, new in new }
            } else {
                next.append(fresh)
            }
            return next
        }
    }

    func deleteBudget(catId: String, uid: String) async throws {
        try await editArray(uid: uid, field: "budgets") { entries in
            entries.filter { FirestoreCodec.looseString($0["catId"]) != catId }
        }
    }

    func saveGoal(_ goal: Goal, uid: String) async throws {
        let fresh = FirestoreCodec.data(for: goal)
        try await editArray(uid: uid, field: "goals") { entries in
            var next = entries
            if let index = next.firstIndex(where: { FirestoreCodec.looseInt($0["id"]) == goal.id }) {
                next[index] = next[index].merging(fresh) { _, new in new }
            } else {
                next.append(fresh)
            }
            return next
        }
    }

    func deleteGoal(id: Int, uid: String) async throws {
        try await editArray(uid: uid, field: "goals") { entries in
            entries.filter { FirestoreCodec.looseInt($0["id"]) != id }
        }
    }

    /// Read-modify-write of one array field on the account document, inside a
    /// transaction so two devices editing at once cannot lose each other's
    /// entry. Only that field is written; nothing else on the document moves.
    private func editArray(uid: String,
                           field: String,
                           _ transform: @escaping ([[String: Any]]) -> [[String: Any]]) async throws {
        let parent = userRef(uid)
        do {
            _ = try await db.runTransaction { (txn: FirebaseFirestore.Transaction, errorPointer: NSErrorPointer) -> Any? in
                let snapshot: DocumentSnapshot
                do {
                    snapshot = try txn.getDocument(parent)
                } catch let error as NSError {
                    errorPointer?.pointee = error
                    return nil
                }
                guard snapshot.exists else {
                    errorPointer?.pointee = NSError(domain: "Richy", code: 404,
                                                    userInfo: [NSLocalizedDescriptionKey: LedgerError.noAccount.errorDescription ?? "No account document."])
                    return nil
                }
                let current = (snapshot.data()?[field] as? [Any])?.compactMap { $0 as? [String: Any] } ?? []
                txn.updateData([field: transform(current)], forDocument: parent)
                return NSNumber(value: true)
            }
        } catch {
            throw LedgerError(error)
        }
    }

    // MARK: The one-time move (the web app's `migrateTx`)

    /// A raw array entry on its way to becoming a document: the document key
    /// (the id as a string) and the data exactly as the web app stored it.
    private struct RawRecord {
        let key: String
        let data: [String: Any]
    }

    func prepareTransactions(uid: String) async throws {
        let parent = userRef(uid)
        let snapshot: DocumentSnapshot
        do {
            snapshot = try await parent.getDocument(source: .server)
        } catch {
            throw LedgerError(error)
        }
        guard snapshot.exists, let data = snapshot.data() else { throw LedgerError.noAccount }
        if FirestoreCodec.schema(of: data) == FirestoreCodec.splitSchema { return }

        // 1. Every array entry becomes a document; documents the array does not
        //    list are removed, so an interrupted earlier attempt can never bring
        //    back a deleted transaction.
        let legacy = Self.dedupe(Self.rawArray(in: data))
        let wanted = Set(legacy.map { $0.key })
        let existing: QuerySnapshot
        do {
            existing = try await txCollection(uid).getDocuments(source: .server)
        } catch {
            throw LedgerError(error)
        }
        let strays = existing.documents.map { $0.documentID }.filter { !wanted.contains($0) }
        try await writeBatches(uid: uid, puts: legacy, deletes: strays)

        // 2. The switch itself, against a fresh read of the parent: whatever
        //    another session changed in the array meanwhile is carried over
        //    before the array is dropped, and a document that already switched
        //    is left alone.
        let writtenByKey = Dictionary(legacy.map { ($0.key, $0.data) }, uniquingKeysWith: { first, _ in first })
        do {
            _ = try await db.runTransaction { (txn: FirebaseFirestore.Transaction, errorPointer: NSErrorPointer) -> Any? in
                let fresh: DocumentSnapshot
                do {
                    fresh = try txn.getDocument(parent)
                } catch let error as NSError {
                    errorPointer?.pointee = error
                    return nil
                }
                guard fresh.exists, let freshData = fresh.data() else { return NSNumber(value: false) }
                if FirestoreCodec.schema(of: freshData) == FirestoreCodec.splitSchema { return NSNumber(value: true) }
                let current = Self.dedupe(Self.rawArray(in: freshData))
                let currentKeys = Set(current.map { $0.key })
                for entry in current {
                    if let written = writtenByKey[entry.key], NSDictionary(dictionary: written).isEqual(to: entry.data) {
                        continue
                    }
                    txn.setData(entry.data, forDocument: self.txDoc(uid, key: entry.key))
                }
                for entry in legacy where !currentKeys.contains(entry.key) {
                    txn.deleteDocument(self.txDoc(uid, key: entry.key))
                }
                txn.updateData(["txSchema": FirestoreCodec.splitSchema, "tx": FieldValue.delete()], forDocument: parent)
                return NSNumber(value: true)
            }
        } catch {
            throw LedgerError(error)
        }
        Log.app.info("Transactions moved to the subcollection")
    }

    /// Whole-document puts and deletes in batches of at most `batchLimit`, one
    /// after another, so a failure leaves a clean prefix a retry simply rewrites.
    private func writeBatches(uid: String, puts: [RawRecord], deletes: [String]) async throws {
        enum Operation {
            case put(RawRecord)
            case delete(String)
        }
        var operations: [Operation] = puts.map { .put($0) }
        operations.append(contentsOf: deletes.map { .delete($0) })
        var index = 0
        while index < operations.count {
            let chunk = operations[index..<min(index + Self.batchLimit, operations.count)]
            let batch = db.batch()
            for operation in chunk {
                switch operation {
                case .put(let record):
                    batch.setData(record.data, forDocument: txDoc(uid, key: record.key))
                case .delete(let key):
                    batch.deleteDocument(txDoc(uid, key: key))
                }
            }
            do {
                try await batch.commit()
            } catch {
                throw LedgerError(error)
            }
            index += Self.batchLimit
        }
    }

    /// The `tx` array of a document as raw dictionaries, in order.
    private static func rawArray(in data: [String: Any]) -> [[String: Any]] {
        guard let array = data["tx"] as? [Any] else { return [] }
        return array.compactMap { $0 as? [String: Any] }
    }

    /// The web app's `dedupeTxIds`: ids are `Date.now()` values, so an array can
    /// hold two entries with the same id; as documents they would collapse into
    /// one. Re-id any repeat to the next free integer. Deterministic for a
    /// given array, so this and the web agree on the result.
    private static func dedupe(_ list: [[String: Any]]) -> [RawRecord] {
        var seen = Set<String>()
        var out: [RawRecord] = []
        for (index, entry) in list.enumerated() {
            var record = entry
            var id: Int
            if let stored = FirestoreCodec.looseInt(entry["id"]) {
                id = stored
            } else {
                id = stableId(entry, index: index)
            }
            if seen.contains(String(id)) {
                var next = id
                while seen.contains(String(next)) { next += 1 }
                id = next
            }
            if FirestoreCodec.looseInt(entry["id"]) != id || entry["id"] == nil {
                record["id"] = id
            }
            seen.insert(String(id))
            out.append(RawRecord(key: String(id), data: record))
        }
        return out
    }

    /// The web app's `stableTxId`: a djb2 hash of content and position, in
    /// 32-bit arithmetic, for a record with no id.
    private static func stableId(_ entry: [String: Any], index: Int) -> Int {
        let parts = [
            FirestoreCodec.looseString(entry["date"]) ?? "",
            FirestoreCodec.looseString(entry["amount"]) ?? "",
            FirestoreCodec.looseString(entry["label"]) ?? "",
            FirestoreCodec.looseString(entry["type"]) ?? "",
            String(index)
        ]
        let text = parts.joined(separator: "|")
        var hash: Int32 = 5381
        for unit in text.utf16 {
            hash = (hash &<< 5) &+ hash &+ Int32(unit)
        }
        return Int(hash.magnitude)
    }
}
