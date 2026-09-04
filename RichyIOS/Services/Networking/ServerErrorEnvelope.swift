import Foundation

/// The API speaks two error dialects and one partial-success shape:
///   api/chat.js            { error: { type, message } }   (also Anthropic pass-through)
///   every other route      { ok: false, error: { code, message, provider? } }
///   api/delete-account.js  { ok: false, partial: true, failed: [...], message }
/// One decoder accepts all three so callers never care which route answered.
struct ServerErrorEnvelope: Decodable, Equatable, Sendable {
    static let fallbackMessage = "Something went wrong. Please try again."

    let code: String
    let message: String
    let partial: Bool
    let failed: [String]

    private enum Keys: String, CodingKey {
        case error, ok, partial, failed, message
    }

    private enum ErrorKeys: String, CodingKey {
        case type, code, message, provider
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Keys.self)
        partial = try container.decodeIfPresent(Bool.self, forKey: .partial) ?? false
        failed = try container.decodeIfPresent([String].self, forKey: .failed) ?? []

        if let nested = try? container.nestedContainer(keyedBy: ErrorKeys.self, forKey: .error) {
            let type = try nested.decodeIfPresent(String.self, forKey: .type)
            let codeValue = try nested.decodeIfPresent(String.self, forKey: .code)
            code = type ?? codeValue ?? "unknown"
            message = try nested.decodeIfPresent(String.self, forKey: .message) ?? ServerErrorEnvelope.fallbackMessage
        } else {
            code = partial ? "partial" : "unknown"
            message = try container.decodeIfPresent(String.self, forKey: .message) ?? ServerErrorEnvelope.fallbackMessage
        }
    }
}
