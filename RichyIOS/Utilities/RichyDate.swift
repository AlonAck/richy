import Foundation

/// Date handling that matches the web app to the character. Dates are stored
/// as "YYYY-MM-DD" strings; "today" and "this month" come from the UTC clock,
/// exactly like `new Date().toISOString().slice(0, 10)`; the month key is
/// "YYYY-MM" (the web's `curMonth()`). Keeping the same clock means the two
/// clients never disagree about which month a record belongs to.
enum RichyDate {
    static let utc = TimeZone(identifier: "UTC") ?? TimeZone.current

    private static let isoDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = utc
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let dayLabel: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeZone = utc
        formatter.setLocalizedDateFormatFromTemplate("EEE d MMM")
        return formatter
    }()

    private static let dayLabelWithYear: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeZone = utc
        formatter.setLocalizedDateFormatFromTemplate("d MMM yyyy")
        return formatter
    }()

    private static let monthTitle: DateFormatter = {
        let formatter = DateFormatter()
        formatter.timeZone = utc
        formatter.setLocalizedDateFormatFromTemplate("LLLL yyyy")
        return formatter
    }()

    /// Today as the web app sees it: the UTC calendar day.
    static func today(_ now: Date = Date()) -> String {
        isoDay.string(from: now)
    }

    /// "YYYY-MM" of the current UTC month.
    static func currentMonth(_ now: Date = Date()) -> String {
        String(today(now).prefix(7))
    }

    /// "YYYY-MM" of a stored date.
    static func monthKey(of isoDate: String) -> String {
        String(isoDate.prefix(7))
    }

    static func string(from date: Date) -> String {
        isoDay.string(from: date)
    }

    static func date(from iso: String) -> Date? {
        isoDay.date(from: iso)
    }

    /// The id for a new record: milliseconds since the epoch, the web's `Date.now()`.
    static func newId(_ now: Date = Date()) -> Int {
        Int(now.timeIntervalSince1970 * 1000)
    }

    /// "Today", "Yesterday", "Tue 5 Sep" or "5 Sep 2025" for a section header.
    static func dayLabel(for iso: String, now: Date = Date()) -> String {
        if iso == today(now) { return "Today" }
        let calendar = Calendar(identifier: .gregorian)
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), iso == today(yesterday) {
            return "Yesterday"
        }
        guard let date = date(from: iso) else { return iso }
        if iso.prefix(4) == today(now).prefix(4) {
            return dayLabel.string(from: date)
        }
        return dayLabelWithYear.string(from: date)
    }

    /// "September 2026" for a month key.
    static func monthTitle(for monthKey: String) -> String {
        guard let date = date(from: monthKey + "-01") else { return monthKey }
        return monthTitle.string(from: date)
    }

    /// The web app's `computeAge`: whole years between a "YYYY-MM-DD" date of
    /// birth and now, on the UTC calendar. Nil when the date cannot be read.
    static func age(dob: String, now: Date = Date()) -> Int? {
        guard let birth = date(from: dob) else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = utc
        let birthParts = calendar.dateComponents([.year, .month, .day], from: birth)
        let nowParts = calendar.dateComponents([.year, .month, .day], from: now)
        guard let by = birthParts.year, let bm = birthParts.month, let bd = birthParts.day,
              let ny = nowParts.year, let nm = nowParts.month, let nd = nowParts.day else { return nil }
        var age = ny - by
        if nm < bm || (nm == bm && nd < bd) { age -= 1 }
        return age
    }

    /// Richy is for people 16 and older (terms section 2, privacy section 8).
    static let minimumAge = 16
}
