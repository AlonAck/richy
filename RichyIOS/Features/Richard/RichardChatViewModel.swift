import Foundation
import Observation

/// One conversation with Richard. Messages go through `ChatService` (the
/// existing `/api/chat` route, which owns the model allowlist, the rate limit
/// and the investment-advice guardrail); the system prompt is rebuilt from
/// the live ledger for every send so Richard always sees this month's numbers.
/// Nothing here is persisted yet - the chat lives as long as the screen.
@MainActor
@Observable
final class RichardChatViewModel {
    struct Entry: Identifiable, Equatable {
        let id: UUID
        let role: ChatMessage.Role
        let text: String
        var reported: Bool

        init(role: ChatMessage.Role, text: String) {
            id = UUID()
            self.role = role
            self.text = text
            reported = false
        }

        var isRichard: Bool { role == .assistant }
    }

    private(set) var entries: [Entry] = []
    var draft = ""
    private(set) var isReplying = false
    private(set) var errorMessage: String?

    /// The web app's opening prompts, offered while the conversation is empty.
    let suggestions = [
        "How am I doing this month?",
        "Where could I save without feeling it?",
        "What should I look at first?"
    ]

    private let chat: any ChatService
    private let systemPrompt: @MainActor () -> String
    /// How many of the latest messages travel with each request. Keeps the
    /// request small and the reply focused, as the web client does.
    private let historyLimit = 24

    init(chat: any ChatService, systemPrompt: @escaping @MainActor () -> String) {
        self.chat = chat
        self.systemPrompt = systemPrompt
    }

    var canSend: Bool {
        !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isReplying
    }

    func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isReplying else { return }
        draft = ""
        await ask(text)
    }

    func send(suggestion: String) async {
        guard !isReplying else { return }
        await ask(suggestion)
    }

    /// Re-sends the last question after a failure.
    func retry() async {
        guard !isReplying, let last = entries.last(where: { !$0.isRichard }) else { return }
        if entries.last?.id == last.id {
            entries.removeLast()
        }
        await ask(last.text)
    }

    func report(_ entry: Entry) {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[index].reported = true
        Log.app.notice("A Richard reply was reported")
    }

    func clear() {
        guard !isReplying else { return }
        entries = []
        errorMessage = nil
    }

    private func ask(_ text: String) async {
        errorMessage = nil
        entries.append(Entry(role: .user, text: text))
        isReplying = true
        defer { isReplying = false }
        let history = entries.suffix(historyLimit).map { ChatMessage(role: $0.role, content: $0.text) }
        do {
            let reply = try await chat.reply(to: history, system: systemPrompt(), maxTokens: 700, model: .core)
            entries.append(Entry(role: .assistant, text: reply.isEmpty ? "I did not get a reply back. Try asking again." : reply))
        } catch {
            errorMessage = UserFacingError.message(for: error)
            Log.network.error("Richard reply failed")
        }
    }
}
