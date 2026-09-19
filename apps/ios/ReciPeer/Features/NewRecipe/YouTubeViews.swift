import SwiftUI

/// YouTube connect pitch + Google consent via ASWebAuthenticationSession.
/// Mirrors features/youtube/screens/connect-screen.tsx.
struct YouTubeConnectView: View {
    @Environment(AppRouter.self) private var router
    @State private var store = YouTubeStore()

    private struct Assurance: Identifiable {
        let icon: String
        let title: String
        let body: String
        var id: String { title }
    }

    private let assurances: [Assurance] = [
        Assurance(icon: "checkmark.circle.fill", title: "Only the videos you choose", body: "We never import anything automatically."),
        Assurance(icon: "eye.fill", title: "Read-only access", body: "We can see your uploads — we can't post or change anything."),
        Assurance(icon: "xmark.circle.fill", title: "Disconnect anytime", body: "Revoke access from your channel screen whenever you like."),
    ]

    var body: some View {
        VStack(spacing: 0) {
            FlowHeader(title: "Connect YouTube")

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    Image(systemName: "play.rectangle.fill")
                        .font(.system(size: 25))
                        .foregroundStyle(AppColors.primary)
                        .frame(width: 72, height: 72)
                        .background(AppColors.surfaceMuted)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Bring your cooking videos over from YouTube.")
                            .textStyle(.display)
                        Text("Sign in and choose which of your uploads to turn into recipes. You can pick several at once.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                    }

                    VStack(alignment: .leading, spacing: Spacing.md) {
                        ForEach(assurances) { assurance in
                            HStack(alignment: .top, spacing: Spacing.md) {
                                Image(systemName: assurance.icon)
                                    .font(.system(size: 16))
                                    .foregroundStyle(AppColors.herb)
                                VStack(alignment: .leading, spacing: Spacing.xxs) {
                                    Text(assurance.title).textStyle(.bodyStrong)
                                    Text(assurance.body)
                                        .textStyle(.caption)
                                        .foregroundStyle(AppColors.textSecondary)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }

                    Text("Only import videos you made or have the rights to share.")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)

                    if let error = store.connectError {
                        Text(error)
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.danger)
                    }

                    AppButton(
                        label: "Sign in with Google",
                        loading: store.connecting || store.connectionStatus.isLoading,
                    ) {
                        Task {
                            let connected = await store.connect()
                            if connected {
                                router.recipesPath.append(AppRoute.youtubeUploads)
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.xl)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.xxxl)
            }
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task { await store.loadConnection() }
        .onChange(of: store.connection) { connection in
            // Already connected → the picker is the whole point.
            if connection?.isConnected == true {
                router.recipesPath.append(AppRoute.youtubeUploads)
            }
        }
    }
}

/// Channel header + multi-select picker for your YouTube uploads.
/// Mirrors features/youtube/screens/uploads-screen.tsx.
struct YouTubeUploadsView: View {
    @Environment(AppRouter.self) private var router
    @State private var store = YouTubeStore()
    @State private var showDisconnectConfirm = false
    @State private var importError: String?

    private var channel: YouTubeConnection? {
        if case .connected = store.connection { return store.connection }
        return nil
    }

    var body: some View {
        VStack(spacing: 0) {
            FlowHeader(title: "Your uploads")

            Group {
                if store.connectionStatus.isLoading {
                    VStack {
                        Spacer()
                        ProgressView().tint(AppColors.textSecondary)
                        Spacer()
                    }
                } else if store.connection?.isConnected != true {
                    VStack(spacing: Spacing.md) {
                        Spacer()
                        Text("Your YouTube channel isn't connected.")
                            .textStyle(.body)
                            .foregroundStyle(AppColors.textSecondary)
                        AppButton(label: "Connect YouTube") {
                            router.recipesPath.append(AppRoute.youtubeConnect)
                        }
                        .frame(maxWidth: 260)
                        Spacer()
                    }
                } else {
                    picker
                }
            }
        }
        .background(AppColors.background)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await store.loadConnection()
            await store.loadUploads()
        }
        .alert("Disconnect YouTube?", isPresented: $showDisconnectConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Disconnect", role: .destructive) {
                Task { await store.disconnect() }
            }
        } message: {
            Text("We'll revoke our access to your channel. Your imported recipes stay.")
        }
    }

    private var picker: some View {
        VStack(spacing: 0) {
            channelHeader
            selectBar

            List {
                ForEach(store.videos) { video in
                    VideoRow(
                        video: video,
                        selected: store.selected.contains(video.videoId),
                        capped: store.isBatchFull && !store.selected.contains(video.videoId),
                        onPress: { store.toggle(video.videoId) },
                    )
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .task {
                await store.loadMore()
            }
            .overlay {
                if store.videos.isEmpty {
                    VStack {
                        Spacer()
                        if store.uploadsStatus.isLoading {
                            ProgressView().tint(AppColors.textSecondary)
                        } else {
                            Text("No uploads on this channel yet.")
                                .textStyle(.body)
                                .foregroundStyle(AppColors.textSecondary)
                        }
                        Spacer()
                    }
                }
            }

            footer
        }
    }

    private var channelHeader: some View {
        Group {
            if case .connected(let title, let handle, let thumb, let count) = store.connection {
                HStack(spacing: Spacing.md) {
                    Group {
                        if let thumb, let url = URL(string: thumb) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image): image.resizable().scaledToFill()
                                default: Color.clear
                                }
                            }
                        } else {
                            Color.clear
                        }
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(Circle())

                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text(handle ?? title).textStyle(.bodyStrong).lineLimit(1)
                        Text("\(count) videos")
                            .textStyle(.caption)
                            .foregroundStyle(AppColors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    Button {
                        showDisconnectConfirm = true
                    } label: {
                        Text("Disconnect").textStyle(.caption).foregroundStyle(AppColors.primary)
                    }
                }
                .padding(.vertical, Spacing.md)
            }
        }
    }

    private var selectBar: some View {
        HStack {
            Button {
                let selectable = store.videos.filter { blockedReason($0) == nil }
                store.selectAllOrClear(selectable: selectable)
            } label: {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: store.selected.isEmpty ? "checkmark.circle" : "xmark.circle.fill")
                        .font(.system(size: 15))
                    Text(store.selected.isEmpty ? "Select all" : "Clear")
                        .textStyle(.caption)
                }
                .foregroundStyle(AppColors.primary)
            }
            Spacer()
            Text("\(store.selected.count) of \(maxImportBatch) selected")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)
        }
        .padding(.bottom, Spacing.sm)
    }

    private var footer: some View {
        VStack(spacing: Spacing.sm) {
            if let importError {
                Text(importError).textStyle(.caption).foregroundStyle(AppColors.danger)
            }
            AppButton(
                label: store.selected.count == 1 ? "Import 1 video" : "Import \(store.selected.count) videos",
                loading: store.importing,
                disabled: store.selected.isEmpty,
            ) {
                Task {
                    do {
                        try await store.importSelected()
                        // Mine picks up the new jobs; pop back to the library root.
                        router.recipesPath = NavigationPath()
                    } catch {
                        importError = (error as? ApiError)?.message ?? "Please try again."
                    }
                }
            }
            Text("We'll process them in the background and let you know.")
                .textStyle(.caption)
                .foregroundStyle(AppColors.textSecondary)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal, Spacing.xl)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(AppColors.background)
        .overlay(alignment: .top) { Hairline() }
    }
}

/// A YouTube upload row: thumbnail + duration pill + title + state.
/// Mirrors video-row.tsx.
struct VideoRow: View {
    let video: YouTubeVideoDTO
    let selected: Bool
    let capped: Bool
    let onPress: () -> Void

    private var blocked: String? { blockedReason(video) }
    private var disabled: Bool { blocked != nil || capped }

    var body: some View {
        Button(action: onPress) {
            HStack(spacing: Spacing.md) {
                ZStack(alignment: .bottomTrailing) {
                    Group {
                        if let url = video.thumbnailUrl.flatMap(URL.init) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .success(let image): image.resizable().scaledToFill()
                                default: Rectangle().fill(AppColors.surfaceMuted)
                                }
                            }
                        } else {
                            Rectangle().fill(AppColors.surfaceMuted)
                        }
                    }
                    .frame(width: 112, height: 63)
                    .clipShape(RoundedRectangle(cornerRadius: Radius.md))

                    Text(formatDuration(video.durationSec))
                        .textStyle(.micro)
                        .foregroundStyle(AppColors.textInverse)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 1)
                        .background(Color.black.opacity(0.72))
                        .clipShape(RoundedRectangle(cornerRadius: Radius.sm))
                        .padding(4)
                }

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(video.title).textStyle(.label).lineLimit(2)
                    Text(blocked ?? "\(formatViews(video.viewCount)) views")
                        .textStyle(.caption)
                        .foregroundStyle(AppColors.textSecondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(AppColors.primary)
                }
            }
            .padding(Spacing.sm)
            .background(AppColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: Radius.card))
            .overlay {
                RoundedRectangle(cornerRadius: Radius.card)
                    .stroke(selected ? AppColors.primary : AppColors.border, lineWidth: 1)
            }
            .opacity(disabled ? 0.45 : 1)
        }
        .buttonStyle(.pressScale)
        .disabled(disabled)
    }
}

/// Confirmation screen after a successful OAuth callback (youtube-connected.tsx).
struct YouTubeConnectedView: View {
    var body: some View {
        AppScreen {
            VStack(spacing: Spacing.lg) {
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(AppColors.herb)
                Text("YouTube connected")
                    .textStyle(.title)
                Text("You can head back and pick the videos you'd like to import.")
                    .textStyle(.body)
                    .foregroundStyle(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                Spacer()
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// Shared "not built yet" stop for the later methods (coming-soon.tsx).
struct ComingSoonView: View {
    var body: some View {
        AppScreen {
            VStack(spacing: Spacing.md) {
                Spacer()
                Image(systemName: "sparkles")
                    .font(.system(size: 28))
                    .foregroundStyle(AppColors.accent)
                    .frame(width: 72, height: 72)
                    .background(AppColors.surfaceMuted)
                    .clipShape(Circle())
                Text("Coming soon").textStyle(.heading)
                Text("This way to add a recipe isn't live yet.")
                    .textStyle(.body)
                    .foregroundStyle(AppColors.textSecondary)
                    .multilineTextAlignment(.center)
                Spacer()
            }
        }
        .toolbar(.hidden, for: .navigationBar)
    }
}
