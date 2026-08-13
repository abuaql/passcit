import SwiftUI

struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "flag.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            VStack(spacing: 8) {
                Text("Welcome to Passcit")
                    .font(.largeTitle.bold())
                    .multilineTextAlignment(.center)

                Text("Your path to U.S. citizenship, made simple.")
                    .font(.title3)
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
    WelcomeView()
}
