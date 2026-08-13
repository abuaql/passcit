import SwiftUI

struct RegisterView: View {
    var viewModel: AuthViewModel
    var onSwitchToLogin: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Text("Create Account")
                .font(.title)
                .bold()

            TextField("Name", text: Bindable(viewModel).name)
                .textContentType(.name)
                .textFieldStyle(.roundedBorder)

            TextField("Email", text: Bindable(viewModel).email)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: Bindable(viewModel).password)
                .textContentType(.newPassword)
                .textFieldStyle(.roundedBorder)

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .foregroundStyle(.red)
                    .font(.footnote)
            }

            Button {
                Task { await viewModel.register() }
            } label: {
                if viewModel.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Text("Register")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.isLoading || viewModel.name.isEmpty || viewModel.email.isEmpty || viewModel.password.isEmpty)

            Button("Already have an account? Sign In", action: onSwitchToLogin)
                .font(.footnote)
        }
        .padding()
    }
}
