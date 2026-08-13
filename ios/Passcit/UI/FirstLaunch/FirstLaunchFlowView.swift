import SwiftUI

struct FirstLaunchFlowView: View {
    var onFinish: () -> Void
    @State private var step = 0

    private let lastStep = 3

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $step) {
                WelcomeView().tag(0)
                ProductIntroView().tag(1)
                RoadmapTeaserView().tag(2)
                StartLearningCTAView().tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .animation(.default, value: step)

            // Deliberately a sibling of TabView, not nested inside its
            // paged content — a Button inside TabView(.page) can lose
            // its tap to the page-scroll gesture recognizer.
            Button {
                if step < lastStep {
                    step += 1
                } else {
                    onFinish()
                }
            } label: {
                Text(step < lastStep ? "Continue" : "Start Learning")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(32)
        }
    }
}

#Preview {
    FirstLaunchFlowView(onFinish: {})
}
