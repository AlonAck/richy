import Foundation

/// The two models `api/chat.js` allows. Anything else is mapped to `core`
/// server-side, so there is no point sending anything else.
enum RichardModel: String, Codable, Sendable {
    /// Quality tier: the Advisor's full conversations.
    case core = "claude-sonnet-5"
    /// Short, tightly scoped work: translation, narration, compact JSON.
    case fast = "claude-haiku-4-5"
}

struct ChatMessage: Codable, Equatable, Sendable {
    enum Role: String, Codable, Sendable {
        case user
        case assistant
    }

    let role: Role
    let content: String
}

/// The exact body `api/chat.js` accepts (`maxTokens`, camel case, is what it reads).
struct ChatRequest: Encodable, Sendable {
    let messages: [ChatMessage]
    let system: String
    let maxTokens: Int
    let model: String

    init(messages: [ChatMessage], system: String, maxTokens: Int = 800, model: RichardModel = .core) {
        self.messages = messages
        self.system = system
        self.maxTokens = maxTokens
        self.model = model.rawValue
    }
}

/// The Anthropic Messages response `api/chat.js` passes straight through.
struct AnthropicResponse: Decodable, Sendable {
    struct ContentBlock: Decodable, Sendable {
        let type: String
        let text: String?
    }

    let content: [ContentBlock]

    /// Every text block, concatenated - the same reduction the web client does.
    var text: String {
        content
            .filter { $0.type == "text" }
            .compactMap { $0.text }
            .joined()
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
