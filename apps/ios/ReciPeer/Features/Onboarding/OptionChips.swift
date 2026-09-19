import SwiftUI

/// A single toggleable pill — shared by single- and multi-select groups.
struct Chip: View {
    let label: String
    let active: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .textStyle(.label)
                .foregroundStyle(active ? AppColors.onPrimary : AppColors.textPrimary)
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.sm)
                .background(active ? AppColors.primary : AppColors.surface)
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(active ? AppColors.primary : AppColors.border, lineWidth: 1)
                }
        }
        .buttonStyle(.pressScale)
    }
}

/// A labelled field wrapper so every question reads consistently.
struct Field<Content: View>: View {
    let label: String
    var hint: String? = nil
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            AppText(label, variant: .label)
            if let hint {
                AppText(hint, variant: .caption, color: AppColors.textSecondary)
            }
            FlowLayout(spacing: Spacing.sm) {
                content
            }
            .padding(.top, Spacing.xs)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SelectOption<T: Hashable>: Identifiable {
    let value: T
    let label: String
    var id: T { value }
}

/// Single-select chip group. Tapping the active chip again clears the selection.
struct SingleChoice<T: Hashable>: View {
    let options: [SelectOption<T>]
    @Binding var value: T?

    var body: some View {
        ForEach(options) { option in
            Chip(label: option.label, active: value == option.value) {
                value = (value == option.value) ? nil : option.value
            }
        }
    }
}

/// Multi-select chip group. Each tap toggles that value in/out of the set.
struct MultiChoice<T: Hashable>: View {
    let options: [SelectOption<T>]
    @Binding var values: Set<T>

    var body: some View {
        ForEach(options) { option in
            Chip(label: option.label, active: values.contains(option.value)) {
                if values.contains(option.value) {
                    values.remove(option.value)
                } else {
                    values.insert(option.value)
                }
            }
        }
    }
}

/// Wrapping horizontal layout for chips (FlowLayout is built into iOS 16+).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: ProposedViewSize(bounds.size), subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y),
                proposal: .unspecified,
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews)
        -> (size: CGSize, positions: [CGPoint])
    {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var size = CGSize.zero
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0

        for subview in subviews {
            let subviewSize = subview.sizeThatFits(.unspecified)
            if x + subviewSize.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, subviewSize.height)
            x += subviewSize.width + spacing
            size.width = max(size.width, x - spacing)
        }
        size.height = y + rowHeight
        return (size, positions)
    }
}
