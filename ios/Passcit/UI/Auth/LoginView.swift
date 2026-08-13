import SwiftUI

struct LoginView: View {
    var viewModel: AuthViewModel
    var onSwitchToRegister: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Sign In")
                .font(.title)
                .bold()

            TextField("Email", text: Bindable(viewModel).email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: Bindable(viewModel).password)
                .textContentType(.password)
                .textFieldStyle(.roundedBorder)

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.footnote)
            }

            Button {
                Task { await viewModel.login() }
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Sign In")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isLoading || viewModel.email.isEmpty || viewModel.password.isEmpty)

            Button("Don't have an account? Register", action: onSwitchToRegister)
                .font(.footnote)
        }
        .padding()
    }
}
