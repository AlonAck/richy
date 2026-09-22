import SwiftUI
import UIKit

/// Alfred's chat. Your messages are bubbles on the right; Alfred's answers
/// are plain text on the left, the way an assistant reads best. The AI
/// disclosure is the first thing in the conversation and stays under the
/// composer; every reply can be reported from its context menu.
struct AlfredChatView: View {
    let user: AuthUser

    @Environment(LedgerStore.self) private var store
    @Environment(\.services) private var services
    @Environment(\.openURL) private var openURL
    @State private var model: AlfredChatViewModel?
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
            .navigationTitle("Alfred")
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
                    model = AlfredChatViewModel(chat: chat) {
                        AlfredPrompt.system(store: store, user: user)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func conversation(_ model: AlfredChatViewModel) -> some View {
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
                            AlfredAvatar()
                            ProgressView()
                                .tint(RichyColor.accent)
                            Text("Alfred is reading your numbers")
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

    private func opening(_ model: AlfredChatViewModel) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                AlfredAvatar()
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
    private func bubble(_ entry: AlfredChatViewModel.Entry, model: AlfredChatViewModel) -> some View {
        if entry.isAlfred {
            HStack(alignment: .top, spacing: Spacing.sm) {
                AlfredAvatar()
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(AlfredText.attributed(entry.text))
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
                    if let url = AlfredText.reportMail(for: entry.text) {
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

    /// The composer floats on glass, over the conversation rather than on a
    /// bar welded beneath it: the last thing Alfred said keeps moving under
    /// it as you scroll, and the panel picks that up.
    ///
    /// It is one piece of glass, not three. The field and the send button sit
    /// *inside* it on flat fills, because glass cannot sample glass - nesting
    /// them would leave each one reading a different backdrop. The AI notice
    /// rides inside the same panel so it stays legible over whatever happens
    /// to be scrolling past.
    private func composer(_ model: AlfredChatViewModel) -> some View {
        @Bindable var model = model
        return VStack(spacing: Spacing.sm) {
            HStack(alignment: .bottom, spacing: Spacing.sm) {
                TextField("Ask Alfred", text: $model.draft, axis: .vertical)
                    .lineLimit(1...5)
                    .font(RichyFont.ui(RichyFont.Size.body))
                    .foregroundStyle(RichyColor.ink)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(RichyColor.fill, in: Capsule(style: .continuous))
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
            Text("Alfred is an AI. Replies can be wrong and are not investment advice.")
                .font(RichyFont.ui(RichyFont.Size.caption))
                .foregroundStyle(RichyColor.ink3)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .richyGlass(in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .padding(.horizontal, Spacing.md)
        .padding(.bottom, Spacing.sm)
    }

    private var firstName: String {
        if let name = user.displayName, let first = name.split(separator: " ").first, !first.isEmpty {
            return String(first)
        }
        if let email = user.email, let at = email.firstIndex(of: "@") { return String(email[..<at]) }
        return "there"
    }
}

/// Alfred's mark in the conversation: the logo tile at row scale.
struct AlfredAvatar: View {
    var body: some View {
        Text("R")
            .font(RichyFont.display(15))
            .foregroundStyle(RichyColor.logoGlyph)
            .frame(width: 28, height: 28)
            .background(RichyColor.logoTile, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .accessibilityHidden(true)
    }
}

/// The opening prompts, as glass chips.
///
/// They are controls offered over the conversation, not part of it, so they
/// belong on the glass layer. There are three of them and they share one
/// container: each loose piece of glass would otherwise sample its own
/// backdrop and cost its own set of offscreen textures.
struct FlowChips: View {
    let items: [String]
    let action: (String) -> Void

    var body: some View {
        RichyGlassContainer(spacing: 16) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                ForEach(items, id: \.self) { item in
                    Button {
                        action(item)
                    } label: {
                        Text(item)
                            .font(RichyFont.ui(RichyFont.Size.subhead, weight: .medium))
                            .foregroundStyle(RichyColor.accent)
                            .padding(.horizontal, 15)
                            .padding(.vertical, 10)
                            .richyGlass(tint: RichyColor.accentDim, interactive: true)
                    }
                    .buttonStyle(RichyGlassButtonStyle())
                }
            }
        }
    }
}

/// Alfred's lightly structured text, as the web renders it: **bold**
/// inline and "- " bullets on their own lines.
enum AlfredText {
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
            URLQueryItem(name: "subject", value: "Reporting a Alfred reply"),
            URLQueryItem(name: "body", value: "I want to report this reply from Alfred in the iOS app:\n\n" + reply + "\n\nWhat was wrong with it:\n")
        ]
        return components.url
    }
}

#Preview("Alfred") {
    AlfredChatView(user: MockAuthService.demoUser)
        .environment(LedgerStore.preview())
        .environment(\.services, .mock())
}
