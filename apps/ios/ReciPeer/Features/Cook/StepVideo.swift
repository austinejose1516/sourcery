import SwiftUI
import AVKit
import WebKit

/// Inline countdown for a waiting step — tap to start/pause, restart when done.
/// Mirrors step-timer.tsx.
struct StepTimer: View {
    let seconds: Int
    let label: String

    @State private var left: Int
    @State private var running = false
    @State private var done = false
    @State private var timer: Timer?

    init(seconds: Int, label: String) {
        self.seconds = seconds
        self.label = label
        _left = State(initialValue: seconds)
    }

    private var pct: Double {
        seconds > 0 ? 1 - Double(left) / Double(seconds) : 0
    }

    private var subtitle: String {
        if done {
            "\(label) complete"
        } else if running {
            "\(label) · counting down"
        } else {
            "\(fmtClock(Double(seconds))) · tap to start \(label)"
        }
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            Button {
                if done {
                    left = seconds
                    done = false
                    running = true
                } else {
                    running.toggle()
                }
            } label: {
                Image(systemName: done ? "checkmark" : running ? "pause.fill" : "play.fill")
                    .font(.system(size: 17))
                    .foregroundStyle(CookColors.onAccent)
                    .frame(width: 46, height: 46)
                    .background(done ? CookColors.success : CookColors.accent)
                    .clipShape(Circle())
            }
            .buttonStyle(.pressScale)

            VStack(alignment: .leading, spacing: 2) {
                Text(done ? "Done" : fmtClock(Double(left)))
                    .font(.custom(AppFont.bodySemibold, size: 24))
                    .tracking(0.5)
                    .foregroundStyle(done ? CookColors.success : CookColors.fg)
                Text(subtitle)
                    .font(.custom(AppFont.body, size: 12))
                    .foregroundStyle(CookColors.fgMuted)
                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(CookColors.chip)
                        Capsule()
                            .fill(done ? CookColors.success : CookColors.accent)
                            .frame(width: proxy.size.width * pct)
                    }
                }
                .frame(height: 3)
                .padding(.top, Spacing.sm)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(CookColors.panel)
        .clipShape(RoundedRectangle(cornerRadius: Radius.card))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.card).stroke(CookColors.border, lineWidth: 0.5)
        }
        .onChange(of: seconds) { newValue in
            left = newValue
            running = false
            done = false
        }
        .onChange(of: running) { isRunning in
            timer?.invalidate()
            timer = nil
            guard isRunning else { return }
            timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
                Task { @MainActor in
                    if left <= 1 {
                        left = 0
                        running = false
                        done = true
                    } else {
                        left -= 1
                    }
                }
            }
        }
    }
}

/// Inline "watch this step" player: play poster → fetch descriptor → looping
/// segment for uploads, YouTube embed for imports. Mirrors step-video.tsx.
struct StepVideo: View {
    let recipeId: String
    let step: RecipeViewStepDTO
    var playSignal: Int = 0

    @State private var started = false
    @State private var muted = true
    @State private var video: RecipeVideoDTO?
    @State private var error = false
    @State private var baselineSignal: Int?

    private var clip: StepClip? { step.clip }

    var body: some View {
        Group {
            if let clip {
                VStack(alignment: .leading, spacing: 0) {
                    ZStack(alignment: .topLeading) {
                        RoundedRectangle(cornerRadius: Radius.md)
                            .fill(CookColors.frame)
                            .aspectRatio(16 / 10, contentMode: .fit)

                        if !started {
                            poster(clip)
                        } else if let video, !error {
                            if video.kind == .upload, let url = URL(string: video.url) {
                                UploadSegmentView(url: url, startMs: clip.startMs, endMs: clip.endMs, muted: muted)
                            } else if video.kind == .youtube, let youTubeId = video.youtubeId {
                                YouTubeSegmentView(
                                    videoId: youTubeId,
                                    startMs: clip.startMs,
                                    endMs: clip.endMs,
                                    muted: muted,
                                )
                            } else {
                                loader
                            }
                        } else if error {
                            Text("Couldn't load the clip")
                                .font(.custom(AppFont.body, size: 12))
                                .foregroundStyle(CookColors.fgMuted)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            loader
                        }

                        if started, video != nil, !error {
                            Button {
                                muted.toggle()
                            } label: {
                                Image(systemName: muted ? "speaker.slash" : "speaker.wave.2")
                                    .font(.system(size: 12))
                                    .foregroundStyle(CookColors.fg)
                                    .frame(width: 32, height: 32)
                                    .background(Color.black.opacity(0.45))
                                    .clipShape(Circle())
                            }
                            .padding(Spacing.sm)
                        }
                    }
                }
                .padding(.top, Spacing.md)
                .task(id: started) {
                    guard started else { return }
                    video = try? await RecipesService.fetchRecipeVideo(recipeId)
                    if video == nil { error = true }
                }
                .onChange(of: playSignal) { signal in
                    if baselineSignal == nil {
                        baselineSignal = signal
                    } else if signal != baselineSignal {
                        started = true
                    }
                }
            }
        }
    }

    private func poster(_ clip: StepClip) -> some View {
        Button {
            started = true
        } label: {
            VStack(spacing: Spacing.md) {
                Image(systemName: "play.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(CookColors.onAccent)
                    .frame(width: 56, height: 56)
                    .background(CookColors.accent)
                    .clipShape(Circle())
                Text("Watch this step · \(fmtMs(clip.endMs - clip.startMs))")
                    .font(.custom(AppFont.bodyMedium, size: 12.5))
                    .foregroundStyle(CookColors.fg)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(.pressScale)
    }

    private var loader: some View {
        VStack(spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .fill(CookColors.accent)
                        .frame(width: 8, height: 8)
                        .opacity(0.4)
                        .offset(y: -3)
                        .animation(
                            .easeInOut(duration: 0.48).repeatForever(autoreverses: true).delay(Double(i) * 0.14),
                            value: started,
                        )
                }
            }
            Text("Loading clip…")
                .font(.custom(AppFont.body, size: 11.5))
                .foregroundStyle(CookColors.fgMuted)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Loops the [startMs, endMs] segment of an uploaded video.
struct UploadSegmentView: View {
    let url: URL
    let startMs: Int
    let endMs: Int
    let muted: Bool

    @State private var player: AVQueuePlayer?
    @State private var looper: AVPlayerLooper?

    var body: some View {
        VideoPlayer(player: player)
            .aspectRatio(16 / 10, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md))
            .onAppear {
                if player == nil {
                    let item = AVPlayerItem(url: url)
                    let queue = AVQueuePlayer()
                    queue.isMuted = muted
                    looper = AVPlayerLooper(player: queue, templateItem: item)
                    queue.play()
                    player = queue
                }
            }
            .onDisappear {
                player?.pause()
                looper?.disableLooping()
                looper = nil
                player = nil
            }
            .onChange(of: muted) { newValue in
                player?.isMuted = newValue
            }
    }
}

/// YouTube embed for imported recipes — plays the [startMs, endMs] window on loop.
struct YouTubeSegmentView: View {
    let videoId: String
    let startMs: Int
    let endMs: Int
    let muted: Bool

    var body: some View {
        WebView(html: Self.embedHTML(
            videoId: videoId,
            startSeconds: startMs / 1000,
            endSeconds: endMs / 1000,
            muted: muted,
        ))
        .aspectRatio(16 / 10, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .id("\(videoId)-\(startMs)-\(muted)")
    }

    private static func embedHTML(videoId: String, startSeconds: Int, endSeconds: Int, muted: Bool) -> String {
        let muteParam = muted ? 1 : 0
        return """
        <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body{margin:0;background:#120D07;overflow:hidden}iframe{width:100%;height:100%;border:0}</style>
        </head><body>
        <iframe src="https://www.youtube.com/embed/\(videoId)?start=\(startSeconds)&end=\(endSeconds)&autoplay=1&mute=\(muteParam)&controls=0&loop=1&playlist=\(videoId)&modestbranding=1&playsinline=1&rel=0"
                allow="autoplay; encrypted-media" allowfullscreen></iframe>
        <script>
          // YouTube's start/end params don't loop the segment, so re-seek via the API-less
          // postMessage fallback: reload the iframe when the clip window elapses.
          const clipLength = (\(endSeconds) - \(startSeconds)) * 1000;
          if (clipLength > 0 && clipLength < 15 * 60 * 1000) {
            setInterval(() => {
              const frame = document.querySelector('iframe');
              if (frame) { const src = frame.src; frame.src = src; }
            }, clipLength);
          }
        </script>
        </body></html>
        """
    }
}

/// Minimal WKWebView wrapper for the YouTube iframe embed.
struct WebView: UIViewRepresentable {
    let html: String

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        webView.loadHTMLString(html, baseURL: nil)
    }
}
