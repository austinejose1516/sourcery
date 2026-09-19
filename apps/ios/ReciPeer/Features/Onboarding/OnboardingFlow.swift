import SwiftUI

/// Post-sign-up onboarding: health profile → permissions → enter app.
struct OnboardingFlow: View {
    var onDone: () -> Void
    @State private var step: Step = .health

    enum Step {
        case health, permissions
    }

    var body: some View {
        Group {
            switch step {
            case .health:
                HealthProfileView(onNext: { withAnimation { step = .permissions } })
            case .permissions:
                PermissionsView(onDone: onDone)
            }
        }
    }
}
