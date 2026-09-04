import Foundation

/// One round-trip to Richard through `POST /api/chat`. The server owns the
/// model allowlist, the rate limit and the investment-advice guardrail; the
/// client sends messages and a system prompt and gets text back.
protocol ChatService: Sendable {
    func reply(to messages: [ChatMessage],
               system: String,
               maxTokens: Int,
               model: RichardModel) async throws -> String
}

final class RichyChatService: ChatService {
    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func reply(to messages: [ChatMessage],
               system: String,
               maxTokens: Int = 800,
               model: RichardModel = .core) async throws -> String {
        let body = ChatRequest(messages: messages, system: system, maxTokens: maxTokens, model: model)
        let request = try APIRequest.post("/api/chat", json: body)
        let response: AnthropicResponse = try await client.send(request)
        return response.text
    }
}

/// Answers without a network, for previews and demo mode.
final class MockChatService: ChatService {
    func reply(to messages: [ChatMessage],
               system: String,
               maxTokens: Int,
               model: RichardModel) async throws -> String {
        try await Task.sleep(nanoseconds: 600_000_000)
        return "This is a demo reply. Connect Firebase to talk to the real Richard."
    }
}
