import SwiftUI
import AVKit
import WebKit

/// SF-symbol + color + label for each assistant state (cook-step.tsx MIC_VISUAL).
struct MicVisual {
    let icon: String
    let color: Color
    let pulse: Bool
    let label: String
}

func micVisual(_ status: VoiceStatus) -> MicVisual {
    switch status {
    case .idle: MicVisual(icon: "mic.fill", color: CookColors.accent, pulse: false, label: "Tap to talk")
    case .wake: MicVisual(icon: "sparkles", color: Color(hex: 0x56B0A2), pulse: true, label: "Tap or say “Hey Chef”")
    case .connecting: MicVisual(icon: "ellipsis", color: Color(hex: 0xD8A23E), pulse: true, label: "Connecting…")
    case .listening: MicVisual(icon: "mic.fill", color: CookColors.success, pulse: true, label: "Listening…")
    case .thinking: MicVisual(icon: "arrow.triangle.2.circlepath", color: Color(hex: 0xD8A23E), pulse: true, label: "Thinking…")
    case .speaking: MicVisual(icon: "speaker.wave.2.fill", color: CookColors.primary, pulse: true, label: "Speaking…")
    case .error: MicVisual(icon: "exclamationmark.circle", color: CookColors.danger, pulse: false, label: "Tap to try again")
    }
}

/// Animated mic that *is* the voice status indicator — pulsing halo + icon/color.
private struct VoiceMicButton: View {
    let status: VoiceStatus
    let onPress: () -> Void

    @State private var pulsing = false

    var body: some View {
        let visual = micVisual(status)
        ZStack {
            Circle()
                .fill(visual.color)
                .frame(width: 66, height: 66)
                .scaleEffect(pulsing ? 1.7 : 1)
                .opacity(pulsing ? 0 : 0.45)
                .animation(
                    visual.pulse
                        ? .easeOut(duration: status == .listening || status == .speaking ? 0.85 : 1.5)
                            .repeatForever(autoreverses: false)
                        : .easeOut(duration: 0.15),
                    value: pulsing,
                )

            Button(action: onPress) {
                Image(systemName: visual.icon)
                    .font(.system(size: 24))
                    .foregroundStyle(CookColors.onAccent)
                    .frame(width: 66, height: 66)
                    .background(visual.color)
                    .clipShape(Circle())
                    .overlay {
                        Circle().stroke(Color.white.opacity(0.28), lineWidth: 2)
                    }
                    .shadow(color: visual.color.opacity(0.55), radius: 12)
            }
            .buttonStyle(.pressScale)
        }
        .frame(width: 72, height: 72)
        .onAppear { pulsing = visual.pulse }
        .onChange(of: status) { pulsing = micVisual($0).pulse }
    }
}

/// A single dark, large-text cook step with its ingredients, video, timer, cues.
/// Mirrors cook-step.tsx (voice actions land in Phase 6).
struct CookStep: View {
    let recipeId: String
    let step: RecipeViewStepDTO
    let index: Int
    let total: Int
    let hasVideo: Bool
    var voiceStatus: VoiceStatus = .idle
    var voiceError: String? = nil
    var videoPlaySignal: Int = 0
    let onPrev: () -> Void
    let onNext: () -> Void
    let onExit: () -> Void
    var onVoice: () -> Void = {}

    var body: some View {
        VStack(spacing: 0) {
            topBar

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if let summary = step.summary {
                        Text(summary.uppercased())
                            .font(.custom(AppFont.bodySemibold, size: 11))
                            .tracking(0.9)
                            .foregroundStyle(CookColors.accent)
                            .padding(.bottom, Spacing.sm)
                    }

                    Text(step.instruction)
                        .font(.custom(AppFont.display, size: 26))
                        .foregroundStyle(CookColors.fg)
                        .padding(.bottom, Spacing.md)

                    if !step.stepIngredients.isEmpty {
                        StepIngredients(items: step.stepIngredients)
                    }

                    if hasVideo, step.clip != nil {
                        StepVideo(recipeId: recipeId, step: step, playSignal: videoPlaySignal)
                    }

                    if let timerSeconds = step.timerSeconds {
                        StepTimer(seconds: timerSeconds, label: step.timerLabel ?? "timer")
                            .padding(.top, Spacing.md)
                    }

                    if let caution = step.caution {
                        CautionCallout(caution: caution)
                            .padding(.top, Spacing.md)
                    }

                    if let cue = step.donenessCue {
                        DonenessCue(cue: cue)
                            .padding(.top, Spacing.md)
                    }

                    if let tip = step.tipText {
                        Text("“\(tip)”")
                            .font(.custom(AppFont.display, size: 14))
                            .italic()
                            .foregroundStyle(CookColors.fgMuted)
                            .padding(.top, Spacing.md)
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            statusChip
            navBar
        }
        .background(CookColors.bg)
    }

    private var topBar: some View {
        VStack(spacing: 0) {
            HStack(spacing: Spacing.md) {
                Button(action: onExit) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(CookColors.fg)
                        .frame(width: 38, height: 38)
                        .background(CookColors.chip)
                        .clipShape(Circle())
                }
                .buttonStyle(.pressScale)

                HStack(spacing: Spacing.xs) {
                    ForEach(0..<total, id: \.self) { i in
                        Capsule()
                            .fill(
                                i < index ? CookColors.success
                                    : i == index ? CookColors.accent
                                    : CookColors.chip,
                            )
                            .frame(height: 4)
                    }
                }

                Color.clear.frame(width: 38, height: 38)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.top, Spacing.sm)

            Text("Step \(index + 1) of \(total)")
                .font(.custom(AppFont.body, size: 11))
                .foregroundStyle(CookColors.fgMuted)
                .padding(.top, 2)
                .padding(.bottom, Spacing.xs)
                .frame(maxWidth: .infinity)
        }
    }

    private var statusChip: some View {
        let visual = micVisual(voiceStatus)
        let voiceOn = voiceStatus != .idle && voiceStatus != .error
        return Button(action: onVoice) {
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(voiceOn ? visual.color : CookColors.fgMuted)
                    .frame(width: 7, height: 7)
                Text(voiceStatus == .error && voiceError != nil ? (voiceError ?? "") : visual.label)
                    .textStyle(.bodyStrong)
                    .font(.custom(AppFont.bodyMedium, size: 12))
                    .foregroundStyle(CookColors.fg)
                    .lineLimit(1)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 7)
            .background(CookColors.chip)
            .clipShape(Capsule())
        }
        .buttonStyle(.pressScale)
        .padding(.bottom, Spacing.sm)
    }

    private var navBar: some View {
        let isFirst = index == 0
        let isLast = index == total - 1
        return HStack(spacing: Spacing.md) {
            Button(action: onPrev) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 19))
                    .foregroundStyle(CookColors.fg)
                    .frame(width: 58, height: 58)
                    .background(CookColors.chip)
                    .clipShape(Circle())
            }
            .buttonStyle(.pressScale)
            .opacity(isFirst ? 0.4 : 1)
            .disabled(isFirst)

            Button(action: onNext) {
                HStack(spacing: Spacing.sm) {
                    Text(isLast ? "Finish" : "Done — next step")
                        .font(.custom(AppFont.bodyMedium, size: 16))
                        .foregroundStyle(CookColors.fg)
                    Image(systemName: isLast ? "checkmark" : "chevron.right")
                        .font(.system(size: 17))
                        .foregroundStyle(CookColors.fg)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(CookColors.primary)
                .clipShape(Capsule())
            }
            .buttonStyle(.pressScale)

            VoiceMicButton(status: voiceStatus, onPress: onVoice)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
        .padding(.bottom, Spacing.xl)
    }
}

/// "For this step" ingredient chips.
private struct StepIngredients: View {
    let items: [ViewStepIngredientDTO]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("FOR THIS STEP")
                .font(.custom(AppFont.bodySemibold, size: 10.5))
                .tracking(0.7)
                .foregroundStyle(CookColors.fgMuted)

            FlowLayout(spacing: Spacing.sm) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, ingredient in
                    HStack(spacing: Spacing.xs) {
                        Text(ingredient.name)
                            .font(.custom(AppFont.body, size: 12.5))
                            .foregroundStyle(CookColors.fg)
                        if let qty = ingredient.qty {
                            Text(qty)
                                .font(.custom(AppFont.body, size: 11.5))
                                .foregroundStyle(CookColors.fgMuted)
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, 7)
                    .background(CookColors.chip)
                    .clipShape(Capsule())
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, Spacing.md)
    }
}

/// Severity-tinted caution callout.
private struct CautionCallout: View {
    let caution: StepCaution

    var body: some View {
        let visual = cautionVisual(caution.level)
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: visual.icon)
                .font(.system(size: 12))
                .foregroundStyle(CookColors.fg)
                .frame(width: 26, height: 26)
                .background(visual.accent)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text(visual.label.uppercased())
                    .font(.custom(AppFont.bodySemibold, size: 10.5))
                    .tracking(0.7)
                    .foregroundStyle(visual.accent)
                Text(caution.text)
                    .font(.custom(AppFont.body, size: 13))
                    .foregroundStyle(CookColors.fg)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(visual.accent.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
    }
}

/// The "Look for…" sensory cue.
private struct DonenessCue: View {
    let cue: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: "checkmark")
                .font(.system(size: 12))
                .foregroundStyle(CookColors.fg)
                .frame(width: 26, height: 26)
                .background(CookColors.success.opacity(0.18))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("LOOK FOR")
                    .font(.custom(AppFont.bodySemibold, size: 10.5))
                    .tracking(0.7)
                    .foregroundStyle(CookColors.success)
                Text(cue)
                    .font(.custom(AppFont.body, size: 13))
                    .foregroundStyle(CookColors.fg)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(Spacing.md)
        .background(CookColors.panel)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md))
        .overlay {
            RoundedRectangle(cornerRadius: Radius.md).stroke(CookColors.border, lineWidth: 0.5)
        }
    }
}
