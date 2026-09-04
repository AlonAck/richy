import Foundation

/// One formatter for every amount the app shows. Mirrors the web app's
/// `fmtCur(sym, n)`: symbol first, two decimals, grouping separators, and the
/// sign (when asked for) ahead of the symbol.
///
/// Amounts are `Double` at the JSON boundary because that is what the web app
/// stores. Decimal arithmetic arrives with the Domain port, not here.
enum Money {
    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.usesGroupingSeparator = true
        return formatter
    }()

    static func format(_ amount: Double, symbol: String = "$", signed: Bool = false) -> String {
        let magnitude = formatter.string(from: NSNumber(value: abs(amount)))
            ?? String(format: "%.2f", abs(amount))
        if amount < 0 { return "-" + symbol + magnitude }
        if signed && amount > 0 { return "+" + symbol + magnitude }
        return symbol + magnitude
    }
}
