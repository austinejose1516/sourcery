import SwiftUI

// MARK: - Time + country helpers (features/home/utils.ts)

enum FeedUtils {
    /// ISO-3166 alpha-2 → flag emoji.
    static func countryToFlag(_ iso: String?) -> String {
        guard let iso, iso.count == 2 else { return "" }
        let code = iso.uppercased()
        let base: UInt32 = 0x1F1E6
        var result = ""
        for scalar in code.unicodeScalars {
            let offset = scalar.value - 65
            guard offset <= 25, let flag = UnicodeScalar(base + offset) else { return "" }
            result.unicodeScalars.append(flag)
        }
        return result
    }

    private static let countryNames: [String: String] = [
        "IN": "India", "VN": "Vietnam", "BR": "Brazil", "GE": "Georgia",
        "MA": "Morocco", "LB": "Lebanon", "KR": "South Korea", "CA": "Canada",
    ]

    static func countryName(_ iso: String?) -> String {
        guard let iso else { return "" }
        return countryNames[iso] ?? iso
    }

    /// "Kerala, India" from a region's name + country code.
    static func regionLabel(_ region: FeedRegionDTO?) -> String? {
        guard let region else { return nil }
        return "\(region.name), \(countryName(region.country))"
    }

    /// Overload for the viewer's region DTO.
    static func regionLabel(_ region: ViewRegionDTO?) -> String? {
        guard let region else { return nil }
        return "\(region.name), \(countryName(region.country))"
    }

    /// Compact relative time: "now", "2h", "3d", "5w".
    static func timeAgo(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = parser.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let then = date?.timeIntervalSince1970 else { return "" }
        let seconds = max(0, Int(Date().timeIntervalSince1970 - then))
        if seconds < 60 { return "now" }
        let minutes = seconds / 60
        if minutes < 60 { return "\(minutes)m" }
        let hours = minutes / 60
        if hours < 24 { return "\(hours)h" }
        let days = hours / 24
        if days < 7 { return "\(days)d" }
        let weeks = days / 7
        if weeks < 52 { return "\(weeks)w" }
        return "\(days / 365)y"
    }

    /// "Updated today / yesterday / N days ago / N weeks ago".
    static func relativeDate(_ iso: String) -> String {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = parser.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        guard let then = date else { return "" }
        let days = Int(Date().timeIntervalSince(then) / 86400)
        if days <= 0 { return "Updated today" }
        if days == 1 { return "Updated yesterday" }
        if days < 7 { return "Updated \(days) days ago" }
        let weeks = days / 7
        return weeks == 1 ? "Updated a week ago" : "Updated \(weeks) weeks ago"
    }
}

// MARK: - Avatar (home/components/avatar.tsx)

struct Avatar: View {
    let url: String?
    let name: String
    var size: CGFloat = 40

    var body: some View {
        Group {
            if let url, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
    }

    private var fallback: some View {
        ZStack {
            AppColors.surfaceMuted
            Text(name.trimmingCharacters(in: .whitespaces).first.map { String($0).uppercased() } ?? "?")
                .textStyle(.label)
                .foregroundStyle(AppColors.textSecondary)
        }
    }
}

// MARK: - FlagChip (home/components/flag-chip.tsx)

struct FlagChip: View {
    let country: String?
    let label: String

    var body: some View {
        HStack(spacing: Spacing.xs) {
            let flag = FeedUtils.countryToFlag(country)
            if !flag.isEmpty {
                Text(flag).textStyle(.label)
            }
            Text(label)
                .textStyle(.micro)
                .foregroundStyle(AppColors.textPrimary)
                .lineLimit(1)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(AppColors.surface)
        .clipShape(Capsule())
        .shadow(color: AppColors.textPrimary.opacity(0.18), radius: 6, x: 0, y: 2)
    }
}

// MARK: - SaveButton (home/components/save-button.tsx)

struct SaveButton: View {
    let saved: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: saved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 16))
                .foregroundStyle(saved ? AppColors.primary : AppColors.textPrimary)
                .frame(width: 36, height: 36)
                .background(AppColors.surface)
                .clipShape(Circle())
        }
        .buttonStyle(.pressScale)
    }
}

// MARK: - EndorsementBadge (home/components/endorsement-badge.tsx)

struct EndorsementBadge: View {
    let count: Int
    var region: String? = nil

    var body: some View {
        if count > 0 {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "rosette")
                    .font(.system(size: 13))
                Text(region.map { "\(count) \($0)" } ?? "\(count)")
                    .textStyle(.label)
            }
            .foregroundStyle(AppColors.herb)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(AppColors.surfaceMuted)
            .clipShape(Capsule())
        }
    }
}
