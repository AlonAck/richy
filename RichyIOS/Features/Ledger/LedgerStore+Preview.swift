import Foundation

extension LedgerStore {
    /// A started store on the in-memory ledger, for `#Preview` blocks.
    @MainActor
    static func preview(ledger: MockLedgerService = MockLedgerService()) -> LedgerStore {
        let store = LedgerStore(uid: MockAuthService.demoUser.uid, ledger: ledger)
        store.start()
        return store
    }
}
