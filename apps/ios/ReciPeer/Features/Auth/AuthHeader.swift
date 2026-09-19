import SwiftUI

/// Shared title + subtitle block so every auth screen reads with one voice.
struct AuthHeader: View {
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            AppText(title, variant: .title)
            if let subtitle {
                AppText(subtitle, variant: .body, color: AppColors.textSecondary)
                    .frame(maxWidth: 340, alignment: .leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
