import SwiftUI
import UIKit

/// Richard's chat. Your messages are bubbles on the right; Richard's answers
/// are plain text on the left, the way an assistant reads best. The AI
/// disclosure is the first thing in the conversation and stays under the
/// composer; every reply can be reported from its context menu.
struct RichardChatView: View {
    let user: AuthUser

    @Environment(LedgerStore.self) private var store
    @Environment(\.services) private var services
    @Environment(\.openURL) private var openURL
    @State private var model: RichardChatViewModel?
    @FocusState private var composerFocused: Bool

    var body: some View {
        NavigationStack {
            ZStack {
                RichyColor.background.ignoresSafeArea()
                if let model {
                    conversation(model)
                } else {
                    LoadingView()
                }
            }
            .navigationTitle("Richard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        model?.clear()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .accessibilityLabel("New conversation")
                    .disabled((model?.entries.isEmpty ?? true) || (model?.isReplying ?? false))
                }
            }
            .onAppear {
                if model == nil {
                    let chat = services.chat
                    let store = self.store
                    let user = self.user
                    model = RichardChatViewModel(chat: chat) {
                        RichardPrompt.system(store: store, user: user)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func conversation(_ model: RichardChatViewModel) -> some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Spacing.md) {
                    RichyCard(padding: Spacing.md) {
                        AIDisclosure()
                    }
                    .padding(.bottom, Spacing.xs)

                    if model.entries.isEmpty {
                        opening(model)
                    }

                    ForEach(model.entries) { entry in
                        bubble(entry, model: model)
                            .id(entry.id)
                    }

                    if model.isReplying {
                        HStack(spacing: Spacing.sm) {
                            RichardAvatar()
                            ProgressView()
                                .tint(RichyColor.accent)
                            Text("Richard is reading your numbers")
                                .font(RichyFont.ui(RichyFont.Size.footnote))
                                .foregroundStyle(RichyColor.ink3)
                        }
                        .id("typing")
                    }

                    if let message = model.errorMessage {
                        RichyCard(padding: Spacing.md) {
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text(message)
                                    .font(RichyFont.ui(RichyFont.Size.subhead))
                                    .foregroundStyle(RichyColor.ink2)
                                Button("Try again") {
                                    Task { await model.retry() }
                                }
                                .buttonStyle(SecondaryButtonStyle())
                            }
                        }
                        .id("error")
                    }
                }
                .padding(.horizontal, Spacing.screen)
                .padding(.vertical, Spacing.md)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: model.entries.count) { _, _ in
                if let last = model.entries.last {
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
            .onChange(of: model.isReplying) { _, replying in
                if replying {
                    withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("typing", anchor: .bottom) }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            composer(model)
        }
    }

    private func opening(_ model: RichardChatViewModel) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                RichardAvatar()
                Text("Hi \(firstName). I have your numbers in front of me. What are we looking at?")
                    .font(RichyFont.ui(RichyFont.Size.body))
                    .foregroundStyle(RichyColor.ink)
            }
            FlowChips(items: model.suggestions) { suggestion in
                Task { await model.send(suggestion: suggestion) }
            }
        }
    }

    @ViewBuilder
    private func bubble(_ entry: RichardChatViewModel.Entry, model: RichardChatViewModel) -> some View {
        if entry.isRichard {
            HStack(alignment: .top, spacing: Spacing.sm) {
                RichardAvatar()
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(RichardText.attributed(entry.text))
                        .font(RichyFont.ui(RichyFont.Size.body))
                        .foregroundStyle(RichyColor.ink)
                        .textSelection(.enabled)
                    if entry.reported {
                        Label("Reported to Richy", systemImage: "flag.fill")
                            .font(RichyFont.ui(RichyFont.Size.caption, weight: .semibold))
                            .foregroundStyle(RichyColor.ink3)
                    }
                }
                Spacer(minLength: Spacing.xl)
            }
            .contextMenu {
                Button {
                    UIPasteboard.general.string = entry.text
                } label: {
                    Label("Copy", systemImage: "doc.on.doc")
                }
                Button(role: .destructive) {
                    model.report(entry)
                    if let url = RichardText.reportMail(for: entry.text) {
                        openURL(url)
                    }
                } label: {
                    Label("Report this reply", systemImage: "flag")
                }
            }
        } else {
            HStack {
                Spacer(minLength: Spacing.xxl)
                Text(entry.text)
                    .font(RichyFont.ui(RichyFont.Size.body))
                    .foregroundStyle(Color.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(RichyColor.accent, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                    .textSelection(.enabled)
            }
        }
    }

    private func composer(_ model: RichardChatViewModel) -> some View {
        @Bindable var model = model
        return VStack(spacing: Spacing.xs) {
            HStack(alignment: .bottom, spacing: Spacing.sm) {
                TextField("Ask Richard", text: $model.draft, axis: .vertical)
                    .lineLimit(1...5)
                    .font(RichyFont.ui(RichyFont.Size.body))
                    .foregroundStyle(RichyColor.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(RichyColor.card, in: RoundedRectangle(cornerRadius: Radius.xl, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: Radius.xl, style: .continuous)
                            .strokeBorder(RichyColor.separator, lineWidth: 1)
                    )
                    .focused($composerFocused)
                    .submitLabel(.send)
                    .onSubmit {
                        Task { await model.send() }
                    }
                Button {
                    Task { await model.send() }
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(Color.white)
                        .frame(width: 38, height: 38)
                        .background(model.canSend ? RichyColor.accent : RichyColor.ink3, in: Circle())
                }
                .disabled(!model.canSend)
                .accessibilityLabel("Send")
            }
            Text("Richard is an AI. Replies can be wrong and are not investment advice.")
                .font(RichyFont.ui(RichyFont.Size.caption))
                .foregroundStyle(RichyColor.ink3)
        }
        .padding(.horizontal, Spacing.screen)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.sm)
        .background(RichyColor.background)
    }

    private var firstName: String {
        if let name = user.displayName, let first = name.split(separator: " ").first, !first.isEmpty {
            return String(first)
        }
        if let email = user.email, let at = email.firstIndex(of: "@") { return String(email[..<at]) }
        return "there"
    }
}

/// Richard's mark in the conversation: the logo tile at row scale.
struct RichardAvatar: View {
    var body: some View {
        Text("R")
            .font(RichyFont.display(15))
            .foregroundStyle(RichyColor.logoGlyph)
            .frame(width: 28, height: 28)
            .background(RichyColor.logoTile, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .accessibilityHidden(true)
    }
}

/// Tappable suggestion chips that wrap onto new lines.
struct FlowChips: View {
    let items: [String]
    let action: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ForEach(items, id: \.self) { item in
                Button {
                    action(item)
                } label: {
                    Text(item)
                        .font(RichyFont.ui(RichyFont.Size.subhead, weight: .medium))
                        .foregroundStyle(RichyColor.accent)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 9)
                        .background(RichyColor.accentDim, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}

/// Richard's lightly structured text, as the web renders it: **bold**
/// inline and "- " bullets on their own lines.
enum RichardText {
    static func attributed(_ text: String) -> AttributedString {
        let bulleted = text
            .split(separator: "\n", omittingEmptySubsequences: false)
            .map { line -> String in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                if trimmed.hasPrefix("- ") { return "•  " + String(trimmed.dropFirst(2)) }
                if trimmed.hasPrefix("* ") { return "•  " + String(trimmed.dropFirst(2)) }
                return String(line)
            }
            .joined(separator: "\n")
        var options = AttributedString.MarkdownParsingOptions()
        options.interpretedSyntax = .inlineOnlyPreservingWhitespace
        if let parsed = try? AttributedString(markdown: bulleted, options: options) {
            return parsed
        }
        return AttributedString(bulleted)
    }

    /// The report goes to the support inbox named in the legal pages, with the
    /// reply quoted so the team can see what was said.
    static func reportMail(for reply: String) -> URL? {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = "richysupport@gmail.com"
        components.queryItems = [
            URLQueryItem(name: "subject", value: "Reporting a Richard reply"),
            URLQueryItem(name: "body", value: "I want to report this reply from Richard in the iOS app:\n\n" + reply + "\n\nWhat was wrong with it:\n")
        ]
        return components.url
    }
}

#Preview("Richard") {
    RichardChatView(user: MockAuthService.demoUser)
        .environment(LedgerStore.preview())
        .environment(\.services, .mock())
}
