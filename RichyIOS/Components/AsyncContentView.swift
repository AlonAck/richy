import SwiftUI

/// Renders a `Loadable` value: spinner while loading, `ErrorView` on failure,
/// the empty view when the value is loaded but empty, otherwise the content.
struct AsyncContentView<Value, Content: View, Empty: View>: View {
    let state: Loadable<Value>
    let isEmpty: (Value) -> Bool
    let retry: (() -> Void)?
    let content: (Value) -> Content
    let empty: () -> Empty

    init(_ state: Loadable<Value>,
         isEmpty: @escaping (Value) -> Bool = { _ in false },
         retry: (() -> Void)? = nil,
         @ViewBuilder content: @escaping (Value) -> Content,
         @ViewBuilder empty: @escaping () -> Empty) {
        self.state = state
        self.isEmpty = isEmpty
        self.retry = retry
        self.content = content
        self.empty = empty
    }

    var body: some View {
        switch state {
        case .idle, .loading:
            LoadingView()
        case .failed(let error):
            ErrorView(error: error, retry: retry)
        case .loaded(let value):
            if isEmpty(value) {
                empty()
            } else {
                content(value)
            }
        }
    }
}

extension AsyncContentView where Empty == EmptyView {
    init(_ state: Loadable<Value>,
         retry: (() -> Void)? = nil,
         @ViewBuilder content: @escaping (Value) -> Content) {
        self.init(state, isEmpty: { _ in false }, retry: retry, content: content, empty: { EmptyView() })
    }
}

#Preview("Loaded") {
    AsyncContentView(Loadable.loaded(["Rent", "Groceries", "Transport"])) { items in
        List(items, id: \.self) { Text($0) }
    }
}

#Preview("Empty") {
    AsyncContentView(Loadable.loaded([String]()), isEmpty: { $0.isEmpty }) { items in
        List(items, id: \.self) { Text($0) }
    } empty: {
        EmptyStateView(icon: "tray", title: "Nothing here", message: "This list is empty.")
    }
}
