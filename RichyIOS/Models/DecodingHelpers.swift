import Foundation

/// A single element that swallows its own decoding failure, so one malformed
/// record in an array never takes the whole account down with it.
struct LossyElement<Value: Decodable>: Decodable {
    let value: Value?

    init(from decoder: Decoder) throws {
        value = try? Value(from: decoder)
    }
}

extension KeyedDecodingContainer {
    /// Decodes an array, dropping elements that fail rather than failing the whole array.
    func decodeLossyArray<Value: Decodable>(_ type: Value.Type, forKey key: Key) -> [Value] {
        let elements = (try? decodeIfPresent([LossyElement<Value>].self, forKey: key)) ?? nil
        return (elements ?? []).compactMap { $0.value }
    }

    /// A string the web app may have stored as a number (ids, in particular).
    func decodeLooseString(forKey key: Key) -> String? {
        if let string = try? decode(String.self, forKey: key) { return string }
        if let int = try? decode(Int.self, forKey: key) { return String(int) }
        if let double = try? decode(Double.self, forKey: key) { return String(Int(double)) }
        return nil
    }

    /// An integer the web app may have stored as a float or a string.
    func decodeLooseInt(forKey key: Key) -> Int? {
        if let int = try? decode(Int.self, forKey: key) { return int }
        if let double = try? decode(Double.self, forKey: key) { return Int(double) }
        if let string = try? decode(String.self, forKey: key), let int = Int(string) { return int }
        return nil
    }
}
