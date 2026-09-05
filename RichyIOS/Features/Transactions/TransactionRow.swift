import SwiftUI

/// One ledger line, as on the web app's activity list: the category tile, the
/// label, the category underneath, and the amount - income in green with a
/// plus, everything else in ink.
struct TransactionRow: View {
    let transaction: Transaction
    let category: Category?
    let currency: String

    private var title: String {
        if !transaction.label.isEmpty { return transaction.label }
        return category?.name ?? transaction.category ?? "Transaction"
    }

    private var subtitle: String {
        var parts: [String] = []
        if let name = category?.name ?? transaction.category { parts.append(name) }
        if transaction.pending { parts.append("Pending") }
        if transaction.synced { parts.append("Bank Sync") }
        return parts.joined(separator: " · ")
    }

    private var amountText: String {
        Money.format(transaction.signedAmount, symbol: currency, signed: true)
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            CategoryTile(icon: category?.icon ?? (transaction.isOpening ? "opening" : nil),
                         colorHex: category?.color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(RichyFont.ui(RichyFont.Size.body, weight: .medium))
                    .foregroundStyle(RichyColor.ink)
                    .lineLimit(1)
                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(RichyFont.ui(RichyFont.Size.footnote))
                        .foregroundStyle(RichyColor.ink3)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: Spacing.sm)
            Text(amountText)
                .font(RichyFont.ui(RichyFont.Size.body, weight: .semibold))
                .monospacedDigit()
                .foregroundStyle(transaction.isIncome ? RichyColor.green : RichyColor.ink)
                .opacity(transaction.pending ? 0.6 : 1)
        }
        .padding(.vertical, Spacing.xs)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title), \(amountText)\(transaction.pending ? ", pending" : "")")
    }
}

#Preview("Rows") {
    let categories = MockLedgerService.sampleCategories
    return List(MockLedgerService.sampleTransactions().prefix(5)) { record in
        TransactionRow(transaction: record,
                       category: LedgerMath.category(for: record, in: categories),
                       currency: "$")
            .listRowBackground(RichyColor.card)
    }
    .scrollContentBackground(.hidden)
    .background(RichyColor.background)
}
