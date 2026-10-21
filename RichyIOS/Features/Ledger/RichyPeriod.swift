import Foundation

/// The app-wide period, ported from the web's `periodWindow` so both clients
/// mean the same days by "September" or "last week". One selection is shared
/// by every tab (`LedgerStore.period`): the Dashboard, Activity and Budgets
/// all read the same window, so changing it moves every money-in / money-out
/// number together. Balance, Alfred and goals stay on today on purpose.
enum PeriodUnit: String, CaseIterable, Identifiable, Sendable {
    case week, month, quarter, year, all, custom

    var id: String { rawValue }

    /// The name in the period menu.
    var title: String {
        switch self {
        case .week: return "Week"
        case .month: return "Month"
        case .quarter: return "3 months"
        case .year: return "Year"
        case .all: return "All time"
        case .custom: return "Custom range"
        }
    }

    /// Units that page back through time with the arrows.
    var steppable: Bool { self != .all && self != .custom }
}

/// What the user picked: a kind of period and how many of them back (0 = the
/// one holding today).
struct PeriodSelection: Equatable, Sendable {
    var unit: PeriodUnit
    var back: Int

    static let thisMonth = PeriodSelection(unit: .month, back: 0)
}

/// The days a selection covers. `from...end` is the whole period (`end` can
/// sit in the future while it runs); `to` is `end` clipped to today.
struct PeriodWindow: Equatable, Sendable {
    let unit: PeriodUnit
    let back: Int
    let rolling: Bool
    let from: String
    let end: String
    let to: String
    let days: Int
    /// How many MONTHLY budgets the window holds: 12 for a year, 3 for three
    /// months, about 0.23 for a week. A monthly cap is scaled by this.
    let months: Double
    let isCurrent: Bool
    /// "Oct 2026", "This week", "Aug – Oct 2026", "All time".
    let label: String
    /// For sentences: "this month", "last week", "in Sep 2026".
    let phrase: String

    var steppable: Bool { unit.steppable }

    /// Is this "YYYY-MM-DD" inside the period? All time takes every row.
    func contains(_ isoDate: String) -> Bool {
        guard !isoDate.isEmpty else { return false }
        if unit == .all { return true }
        return isoDate >= from && isoDate <= end
    }
}

/// Settings > Date Range, as the account stores it.
struct PeriodSettings: Equatable, Sendable {
    var mode: String = "calendar"
    var customStart: String?
    var customEnd: String?

    var rolling: Bool { mode == "rolling" }
    /// Both ends of a custom span are saved - the menu can offer "Custom range".
    var hasCustomDates: Bool { !(customStart ?? "").isEmpty && !(customEnd ?? "").isEmpty }
    /// The setting is on custom AND the span is complete.
    var hasCustomSpan: Bool { mode == "custom" && hasCustomDates }

    init(mode: String? = nil, customStart: String? = nil, customEnd: String? = nil) {
        self.mode = mode ?? "calendar"
        self.customStart = customStart
        self.customEnd = customEnd
    }

    init(account: Account?) {
        self.init(mode: account?.periodMode, customStart: account?.periodCustomStart, customEnd: account?.periodCustomEnd)
    }

    /// Where the app opens: the custom span when one is set, else this month.
    var defaultSelection: PeriodSelection {
        hasCustomSpan ? PeriodSelection(unit: .custom, back: 0) : .thisMonth
    }
}

enum RichyPeriod {
    private static let rollDays: [PeriodUnit: Int] = [.week: 7, .month: 30, .quarter: 91, .year: 365]

    private static let calendar: Calendar = {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = RichyDate.utc
        return calendar
    }()

    private static let monthShort: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeZone = RichyDate.utc
        formatter.setLocalizedDateFormatFromTemplate("MMM")
        return formatter
    }()

    private static let dayShort: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeZone = RichyDate.utc
        formatter.setLocalizedDateFormatFromTemplate("MMM d")
        return formatter
    }()

    /// The web's `periodWindow`.
    static func window(_ selection: PeriodSelection,
                       settings: PeriodSettings = PeriodSettings(),
                       firstDate: String? = nil,
                       today: String = RichyDate.today()) -> PeriodWindow {
        var unit = selection.unit
        var back = max(0, selection.back)
        let rolling = settings.rolling
        // A custom span only exists once both ends are set.
        if unit == .custom && !settings.hasCustomDates { unit = .month }
        if unit == .all || unit == .custom { back = 0 }

        let from: String
        let end: String
        if unit == .custom {
            let start = settings.customStart ?? today
            let stop = settings.customEnd ?? today
            from = min(start, stop)
            end = max(start, stop)
        } else if unit == .all {
            if let first = firstDate, !first.isEmpty, first < today { from = first } else { from = today }
            end = today
        } else if rolling {
            let length = rollDays[unit] ?? 30
            end = addDays(today, -length * back)
            from = addDays(end, -(length - 1))
        } else if unit == .week {
            from = weekStart(of: addDays(today, -7 * back))
            end = addDays(from, 6)
        } else if unit == .quarter {
            let lastMonth = monthShift(String(today.prefix(7)), back: back * 3)
            from = monthShift(lastMonth, back: 2) + "-01"
            end = monthEnd(lastMonth)
        } else if unit == .year {
            let year = (Int(today.prefix(4)) ?? 2026) - back
            from = "\(year)-01-01"
            end = "\(year)-12-31"
        } else {
            let month = monthShift(String(today.prefix(7)), back: back)
            from = month + "-01"
            end = monthEnd(month)
        }

        let to = end > today ? today : end
        let days = daysBetween(from, end) + 1
        let months: Double
        switch unit {
        case .month: months = 1
        case .quarter where !rolling: months = 3
        case .year where !rolling: months = 12
        default:
            let raw = (Double(days) / 30.44 * 100).rounded() / 100
            months = max(unit == .all ? 1 : 0.2, raw)
        }

        func span() -> String { dayLabel(from) + " – " + dayLabel(end) }
        let label: String
        if unit == .all {
            label = "All time"
        } else if unit == .custom {
            label = span()
        } else if rolling {
            label = back == 0 ? pastLabel(unit) : span()
        } else if unit == .week {
            label = back == 0 ? "This week" : back == 1 ? "Last week" : span()
        } else if unit == .quarter {
            label = monthLabel(from) + " – " + monthLabel(end) + " " + String(end.prefix(4))
        } else if unit == .year {
            label = String(from.prefix(4))
        } else {
            label = monthLabel(from) + " " + String(from.prefix(4))
        }

        let isCurrent = from <= today && today <= end
        let phrase: String
        if unit == .custom {
            phrase = "in this range"
        } else if isCurrent && back == 0 {
            phrase = rolling && unit != .all ? label.lowercased() : nowPhrase(unit)
        } else if !rolling && unit == .week && back == 1 {
            phrase = "last week"
        } else {
            phrase = "in " + label
        }

        return PeriodWindow(unit: unit, back: back, rolling: rolling, from: from, end: end, to: to,
                            days: days, months: months, isCurrent: isCurrent, label: label, phrase: phrase)
    }

    // MARK: - "YYYY-MM-DD" arithmetic on the UTC calendar, like the web.

    static func addDays(_ iso: String, _ days: Int) -> String {
        guard let date = RichyDate.date(from: iso),
              let moved = calendar.date(byAdding: .day, value: days, to: date) else { return iso }
        return RichyDate.string(from: moved)
    }

    static func daysBetween(_ a: String, _ b: String) -> Int {
        guard let first = RichyDate.date(from: a), let second = RichyDate.date(from: b) else { return 0 }
        return Int((second.timeIntervalSince(first) / 86_400).rounded())
    }

    /// Monday of the week holding this day.
    static func weekStart(of iso: String) -> String {
        guard let date = RichyDate.date(from: iso) else { return iso }
        let weekday = calendar.component(.weekday, from: date) // 1 = Sunday
        return addDays(iso, -((weekday + 5) % 7))
    }

    /// "2026-07" moved `back` months into the past.
    static func monthShift(_ ym: String, back: Int) -> String {
        let parts = ym.split(separator: "-")
        guard parts.count == 2, let year = Int(parts[0]), let month = Int(parts[1]) else { return ym }
        let index = year * 12 + (month - 1) - back
        let newYear = Int((Double(index) / 12).rounded(.down))
        let newMonth = ((index % 12) + 12) % 12 + 1
        return String(format: "%04d-%02d", newYear, newMonth)
    }

    /// The last day of "YYYY-MM".
    static func monthEnd(_ ym: String) -> String {
        let next = monthShift(ym, back: -1) + "-01"
        return addDays(next, -1)
    }

    private static func monthLabel(_ iso: String) -> String {
        guard let date = RichyDate.date(from: iso) else { return iso }
        return monthShort.string(from: date)
    }

    private static func dayLabel(_ iso: String) -> String {
        guard let date = RichyDate.date(from: iso) else { return iso }
        return dayShort.string(from: date)
    }

    private static func pastLabel(_ unit: PeriodUnit) -> String {
        switch unit {
        case .week: return "Past 7 days"
        case .quarter: return "Past 3 months"
        case .year: return "Past 12 months"
        default: return "Past 30 days"
        }
    }

    private static func nowPhrase(_ unit: PeriodUnit) -> String {
        switch unit {
        case .week: return "this week"
        case .quarter: return "these 3 months"
        case .year: return "this year"
        case .all: return "all time"
        case .custom: return "in this range"
        case .month: return "this month"
        }
    }
}
