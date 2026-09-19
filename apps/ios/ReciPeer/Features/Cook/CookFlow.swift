import SwiftUI

/// Mutable cook-flow state (index/complete/video nonce) so voice action handlers
/// (which close over a reference type) always read fresh values — the Swift
/// equivalent of the RN stateRef pattern.
@Observable
@MainActor
final class CookSession {
    var index = 0
    var screen: Screen = .cook
    var videoPlayNonce = 0

    enum Screen {
        case cook, complete
    }
}

/// Drives the dark cook experience: step ↔ step → complete, plus the voice
/// assistant (tap-to-talk; the wake word stays unwired, matching the RN app).
/// Mirrors cook-flow.tsx.
struct CookFlow: View {
    let recipe: RecipeViewDTO
    let onExit: () -> Void

    @State private var session = CookSession()
    @State private var store = RecipeViewStore()

    private var assistant: VoiceAssistant { VoiceAssistant.shared }
    private let actionGroupID: String

    init(recipe: RecipeViewDTO, onExit: @escaping () -> Void) {
        self.recipe = recipe
        self.onExit = onExit
        self.actionGroupID = "cook:\(recipe.id)"
    }

    var body: some View {
        Group {
            if session.screen == .complete {
                CompleteScreen(
                    recipe: recipe,
                    onMarkTried: { try await store.markTried() },
                    onClose: onExit,
                )
            } else if let step = recipe.steps[safe: session.index] {
                CookStep(
                    recipeId: recipe.id,
                    step: step,
                    index: session.index,
                    total: recipe.steps.count,
                    hasVideo: recipe.videoKind != nil,
                    voiceStatus: voiceStatus,
                    voiceError: assistant.store.error,
                    videoPlaySignal: session.videoPlayNonce,
                    onPrev: { prev() },
                    onNext: { next() },
                    onExit: onExit,
                    onVoice: { assistant.toggle() },
                )
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            if store.recipe == nil {
                store.recipe = recipe
                store.status = .loaded
            }
            registerVoice()
            Task { await assistant.enable() }
        }
        .onDisappear {
            assistant.store.unregisterActions(actionGroupID)
            assistant.store.unregisterContext(actionGroupID)
            assistant.disable()
        }
        .onChange(of: session.screen) { screen in
            if screen == .complete {
                assistant.disable()
            }
        }
    }

    private var voiceStatus: VoiceStatus {
        switch assistant.phase {
        case .idle: .idle
        case .connecting: .connecting
        case .listening: .listening
        case .speaking: .speaking
        }
    }

    // MARK: - Navigation helpers (handlers return spoken confirmations)

    private func next() -> String? {
        if session.index < recipe.steps.count - 1 {
            session.index += 1
            let ns = recipe.steps[session.index]
            return "Step \(session.index + 1) of \(recipe.steps.count)\(ns.summary.map { ", \($0)" } ?? ""): \(ns.instruction)"
        } else {
            session.screen = .complete
            return "That was the last step — nice work!"
        }
    }

    private func prev() -> String? {
        guard session.index > 0 else { return "You're already on the first step." }
        session.index -= 1
        let ps = recipe.steps[session.index]
        return "Step \(session.index + 1) of \(recipe.steps.count)\(ps.summary.map { ", \($0)" } ?? ""): \(ps.instruction)"
    }

    private func goTo(_ n: Double?) -> String? {
        guard let n else { return "I didn't catch which step you meant." }
        let total = recipe.steps.count
        let target = min(max(0, Int(n) - 1), total - 1)
        session.screen = .cook
        session.index = target
        let ts = recipe.steps[target]
        return "Step \(target + 1) of \(total)\(ts.summary.map { ", \($0)" } ?? ""): \(ts.instruction)"
    }

    // MARK: - Voice registration (CookFlow actions + context)

    private func registerVoice() {
        let steps = recipe.steps

        assistant.store.registerActions(actionGroupID, [
            VoiceAction(
                name: "next_step",
                description: "Advance to the next cooking step (\"next\", \"done\", \"what's next\").",
            ) { _ in
                next()
            },
            VoiceAction(
                name: "previous_step",
                description: "Go back to the previous cooking step.",
            ) { _ in
                prev()
            },
            VoiceAction(
                name: "go_to_step",
                description: "Jump straight to a specific step by its number.",
                parameters: [
                    "type": "object",
                    "properties": [
                        "number": ["type": "integer", "description": "1-based step number"],
                    ],
                    "required": ["number"],
                ],
            ) { args in
                goTo(args["number"]?.numberValue)
            },
            VoiceAction(
                name: "repeat_step",
                description: "Read the current step instruction aloud again.",
            ) { _ in
                if let current = steps[safe: session.index] {
                    "Step \(session.index + 1) of \(steps.count): \(current.instruction)"
                } else {
                    "No step to repeat."
                }
            },
            VoiceAction(
                name: "play_video",
                description: "Play this step's video clip when the user asks to watch or show the video.",
            ) { _ in
                if recipe.videoKind == nil || steps[safe: session.index]?.clip == nil {
                    return "This step doesn't have a video."
                }
                session.videoPlayNonce += 1
                return "Playing the video for this step."
            },
            VoiceAction(
                name: "exit_cooking",
                description: "Leave cook mode and go back to the recipe overview.",
            ) { _ in
                onExit()
                return "Leaving cook mode."
            },
        ])

        assistant.store.registerContext(actionGroupID) { [self] in
            guard let current = steps[safe: session.index] else {
                return "The user is cooking \"\(recipe.title)\"."
            }
            var lines = [
                "The user is cooking \"\(recipe.title)\" in hands-free cook mode.",
                "Current step \(session.index + 1) of \(steps.count)\(current.summary.map { " — \($0)" } ?? ""): \(current.instruction)",
            ]
            if !current.stepIngredients.isEmpty {
                let items = current.stepIngredients
                    .map { ingredient in
                        ingredient.qty.map { "\(ingredient.name) (\($0))" } ?? ingredient.name
                    }
                    .joined(separator: ", ")
                lines.append("Ingredients for this step: \(items).")
            }
            if let timerSeconds = current.timerSeconds {
                let minutes = Int((Double(timerSeconds) / 60).rounded())
                lines.append("Timer: \(current.timerLabel ?? "timer") for about \(minutes) min.")
            }
            if let caution = current.caution {
                lines.append("Caution: \(caution.text)")
            }
            if let cue = current.donenessCue {
                lines.append("Look for: \(cue)")
            }
            return lines.joined(separator: "\n")
        }
    }
}
