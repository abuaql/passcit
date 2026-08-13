import SwiftUI

struct AccountSettingsView: View {
    @State private var viewModel: AccountSettingsViewModel
    @State private var showPasswordChangedAlert = false

    init(apiClient: APIClient, authManager: AuthManager, currentName: String) {
        _viewModel = State(initialValue: AccountSettingsViewModel(
            displayName: currentName,
            accountSettingsService: AccountSettingsService(apiClient: apiClient),
            authManager: authManager
        ))
    }

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Display Name", text: $viewModel.displayName)
                    .textContentType(.name)
                    .autocorrectionDisabled()
                    .accessibilityLabel("Display Name")

                Button {
                    Task { await viewModel.saveName() }
                } label: {
                    if viewModel.isSavingName {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Save")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(!viewModel.canSaveName)

                if let nameError = viewModel.nameError {
                    Text(nameError)
                        .foregroundStyle(.red)
                        .font(.footnote)
                } else if viewModel.nameSaveSucceeded {
                    Label("Name updated", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                        .font(.footnote)
                }
            }

            Section {
                SecureField("Current Password", text: $viewModel.currentPassword)
                    .textContentType(.password)
                    .accessibilityLabel("Current Password")
                SecureField("New Password", text: $viewModel.newPassword)
                    .textContentType(.newPassword)
                    .accessibilityLabel("New Password")
                SecureField("Confirm New Password", text: $viewModel.confirmNewPassword)
                    .textContentType(.newPassword)
                    .accessibilityLabel("Confirm New Password")

                Button {
                    Task { await viewModel.changePassword() }
                } label: {
                    if viewModel.isChangingPassword {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Change Password")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(!viewModel.canChangePassword)

                if let passwordError = viewModel.passwordError {
                    Text(passwordError)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }
            } header: {
                Text("Security")
            } footer: {
                Text("Changing your password signs you out of this and every other device.")
            }
        }
        .navigationTitle("Account Settings")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.fetchContentVersion()
        }
        .onDisappear {
            viewModel.clearPasswordFields()
        }
        .onChange(of: viewModel.passwordChangeSucceeded) { _, succeeded in
            if succeeded {
                showPasswordChangedAlert = true
            }
        }
        .alert("Password Changed", isPresented: $showPasswordChangedAlert) {
            Button("OK") {
                Task { await viewModel.acknowledgePasswordChange() }
            }
        } message: {
            Text("For your security, you've been signed out of this device and will need to sign in again.")
        }
    }
}
