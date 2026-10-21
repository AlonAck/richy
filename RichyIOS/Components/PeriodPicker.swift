import SwiftUI

/// The app-wide period control - the web's header badge. It sits in the
/// toolbar of every money tab and shows what that tab's numbers cover; every
/// tab reads the same `LedgerStore.period`, so a change here moves them all.
struct PeriodToolbarButton: View {
    @Environment(LedgerStore.self) private var store
    @State private var showSheet = false

    var body: some View {
        Button {
            showSheet = true
        } label: {
            HStack(spacing: 4) {
                Text(store.period.label)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.caption2.weight(.semibold))
            }
            .font(RichyFont.ui(RichyFont.Size.subhead, weight: .semibold))
        }
        .accessibilityLabel("Period: \(store.period.label)")
        .accessibilityHint("Choose which dates every screen shows")
        .sheet(isPresented: $showSheet) {
            PeriodSheet()
                .presentationDetents([.medium, .large])
        }
    }
}

/// Step through whole periods (last month, the month before) and pick the
/// kind of period. Forward stops at the one holding today.
struct PeriodSheet: View {
    @Environment(LedgerStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private var units: [PeriodUnit] {
        var list: [PeriodUnit] = [.week, .month, .quarter, .year, .all]
        if store.periodSettings.hasCustomDates { list.append(.custom) }
        return list
    }

    var body: some View {
        let period = store.period
        NavigationStack {
            List {
                Section {
                    HStack(spacing: Spacing.md) {
                        Button {
                            store.stepPeriod(1)
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.body.weight(.semibold))
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.borderless)
                        .disabled(!period.steppable)
                        .accessibilityLabel("Earlier")

                        Text(period.label)
                            .font(RichyFont.display(RichyFont.Size.headline))
                            .foregroundStyle(RichyColor.ink)
                            .frame(maxWidth: .infinity)
                            .multilineTextAlignment(.center)

                        Button {
                            store.stepPeriod(-1)
                        } label: {
                            Image(systemName: "chevron.right")
                                .font(.body.weight(.semibold))
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.borderless)
                        .disabled(!period.steppable || period.back == 0)
                        .accessibilityLabel("Later")
                    }
                    if period.back > 0 {
                        Button("Back to now") {
                            store.selectPeriod(PeriodSelection(unit: period.unit, back: 0))
                        }
                        .frame(maxWidth: .infinity)
                    }
                } footer: {
                    Text("Every screen shows money in and out for this period.")
                }

                Section {
                    ForEach(units) { unit in
                        Button {
                            store.selectPeriod(PeriodSelection(unit: unit, back: 0))
                        } label: {
                            HStack {
                                Text(unit.title)
                                    .foregroundStyle(RichyColor.ink)
                                Spacer()
                                if period.unit == unit {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(RichyColor.accent)
                                }
                            }
                        }
                        .accessibilityAddTraits(period.unit == unit ? .isSelected : [])
                    }
                }
            }
            .navigationTitle("Period")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

#Preview("Period sheet") {
    PeriodSheet()
        .environment(LedgerStore.preview())
}
