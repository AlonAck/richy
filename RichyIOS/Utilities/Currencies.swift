import Foundation

/// The currencies the web offers at sign-up (`CURRENCY_OPTIONS`), by the
/// symbol it stores. Only the symbol is saved on the account (`currency`),
/// exactly as the web does, so the two clients format money the same way.
struct CurrencyOption: Identifiable, Equatable, Sendable {
    let code: String
    let symbol: String
    let name: String

    var id: String { code }
    var label: String { "\(name) (\(symbol))" }
}

enum Currencies {
    static let options: [CurrencyOption] = [
        CurrencyOption(code: "USD", symbol: "$", name: "US Dollar"),
        CurrencyOption(code: "EUR", symbol: "€", name: "Euro"),
        CurrencyOption(code: "GBP", symbol: "£", name: "British Pound"),
        CurrencyOption(code: "JPY", symbol: "¥", name: "Japanese Yen"),
        CurrencyOption(code: "ILS", symbol: "₪", name: "Israeli Shekel"),
        CurrencyOption(code: "INR", symbol: "₹", name: "Indian Rupee"),
        CurrencyOption(code: "BRL", symbol: "R$", name: "Brazilian Real"),
        CurrencyOption(code: "TRY", symbol: "₺", name: "Turkish Lira"),
        CurrencyOption(code: "GHS", symbol: "₵", name: "Ghanaian Cedi"),
        CurrencyOption(code: "COP", symbol: "Col$", name: "Colombian Peso"),
        CurrencyOption(code: "VND", symbol: "₫", name: "Vietnamese Dong"),
        CurrencyOption(code: "AUD", symbol: "A$", name: "Australian Dollar"),
        CurrencyOption(code: "CAD", symbol: "C$", name: "Canadian Dollar"),
        CurrencyOption(code: "NZD", symbol: "NZ$", name: "New Zealand Dollar"),
        CurrencyOption(code: "HKD", symbol: "HK$", name: "Hong Kong Dollar"),
        CurrencyOption(code: "SGD", symbol: "S$", name: "Singapore Dollar"),
        CurrencyOption(code: "MXN", symbol: "Mex$", name: "Mexican Peso"),
        CurrencyOption(code: "CHF", symbol: "Fr", name: "Swiss Franc"),
        CurrencyOption(code: "CNY", symbol: "CN¥", name: "Chinese Yuan"),
        CurrencyOption(code: "KRW", symbol: "₩", name: "South Korean Won"),
        CurrencyOption(code: "THB", symbol: "฿", name: "Thai Baht"),
        CurrencyOption(code: "PHP", symbol: "₱", name: "Philippine Peso"),
        CurrencyOption(code: "IDR", symbol: "Rp", name: "Indonesian Rupiah"),
        CurrencyOption(code: "MYR", symbol: "RM", name: "Malaysian Ringgit"),
        CurrencyOption(code: "PLN", symbol: "zł", name: "Polish Zloty"),
        CurrencyOption(code: "CZK", symbol: "Kč", name: "Czech Koruna"),
        CurrencyOption(code: "HUF", symbol: "Ft", name: "Hungarian Forint"),
        CurrencyOption(code: "RON", symbol: "lei", name: "Romanian Leu"),
        CurrencyOption(code: "SEK", symbol: "kr", name: "Swedish Krona"),
        CurrencyOption(code: "NOK", symbol: "Nkr", name: "Norwegian Krone"),
        CurrencyOption(code: "DKK", symbol: "Dkr", name: "Danish Krone"),
        CurrencyOption(code: "ISK", symbol: "Íkr", name: "Icelandic Krona"),
        CurrencyOption(code: "RUB", symbol: "₽", name: "Russian Ruble"),
        CurrencyOption(code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia"),
        CurrencyOption(code: "ZAR", symbol: "R", name: "South African Rand"),
        CurrencyOption(code: "NGN", symbol: "₦", name: "Nigerian Naira"),
        CurrencyOption(code: "KES", symbol: "KSh", name: "Kenyan Shilling"),
        CurrencyOption(code: "EGP", symbol: "E£", name: "Egyptian Pound"),
        CurrencyOption(code: "MAD", symbol: "DH", name: "Moroccan Dirham"),
        CurrencyOption(code: "AED", symbol: "د.إ", name: "UAE Dirham"),
        CurrencyOption(code: "SAR", symbol: "ر.س", name: "Saudi Riyal"),
        CurrencyOption(code: "QAR", symbol: "QR", name: "Qatari Riyal"),
        CurrencyOption(code: "KWD", symbol: "KD", name: "Kuwaiti Dinar"),
        CurrencyOption(code: "BHD", symbol: "BD", name: "Bahraini Dinar"),
        CurrencyOption(code: "PKR", symbol: "₨", name: "Pakistani Rupee"),
        CurrencyOption(code: "BDT", symbol: "৳", name: "Bangladeshi Taka"),
        CurrencyOption(code: "LKR", symbol: "SLRs", name: "Sri Lankan Rupee"),
        CurrencyOption(code: "NPR", symbol: "NRs", name: "Nepalese Rupee"),
        CurrencyOption(code: "CLP", symbol: "CLP$", name: "Chilean Peso"),
        CurrencyOption(code: "ARS", symbol: "ARS$", name: "Argentine Peso")
    ]

    /// A sensible default from the device's region, falling back to dollars.
    static func defaultSymbol(locale: Locale = .current) -> String {
        let code = locale.currency?.identifier ?? "USD"
        return options.first { $0.code == code }?.symbol ?? "$"
    }

    static let languages: [(code: String, name: String)] = [
        ("en", "English"),
        ("he", "Hebrew"),
        ("ar", "Arabic"),
        ("ru", "Russian")
    ]
}
