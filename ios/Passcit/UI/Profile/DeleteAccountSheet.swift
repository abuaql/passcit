import SwiftUI

struct DeleteAccountSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: ProfileViewModel
    @State private var password = ""

    init(authManager: AuthManager) {
        _viewModel = State(initialValue: ProfileViewModel(authManager: authManager))
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.red)

                Text("Delete Your Account")
                    .font(.title2.bold())

                Text("This permanently deletes your account and all progress. This cannot be undone.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                if viewModel.needsPassword {
                    SecureField("Password", text: $password)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)
                }

                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Button(role: .destructive) {
                    Task { await attemptDelete() }
                } label: {
                    if viewModel.isProcessing {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Delete My Account")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .controlSize(.large)
                .disabled(viewModel.isProcessing)
                .padding(.horizontal)

                Spacer()
            }
            .padding(.top, 32)
            .navigationTitle("Delete Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func attemptDelete() async {
        let succeeded = await viewModel.deleteAccount(password: viewModel.needsPassword ? password : nil)
        if succeeded {
            dismiss()
        }
    }
}
