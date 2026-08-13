import SwiftUI

struct StartLearningCTAView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            VStack(spacing: 8) {
                Text("Ready when you are")
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)
                Text("You can explore freely — we'll ask you to sign in only when it's time to save your progress.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
            Spacer()
        }
        .padding(32)
    }
}

#Preview {
    StartLearningCTAView()
}
