import SwiftUI

/// Reached only from Profile, which is already signed-in-gated — unlike
/// Learn/Practice/Interview this has no signed-out prompt of its own.
struct EligibilityView: View {
    @State private var viewModel: EligibilityViewModel

    init(apiClient: APIClient) {
        _viewModel = State(initialValue: EligibilityViewModel(eligibilityService: EligibilityService(apiClient: apiClient)))
    }

    var body: some View {
        content
            .navigationTitle(viewModel.phase == .result ? "" : "Eligibility Check")
            .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.phase {
        case .form, .submitting:
            EligibilityFormView(viewModel: viewModel)
        case .result:
            if let result = viewModel.result {
                EligibilityResultView(result: result) {
                    viewModel.startNewCalculation()
                }
            }
        case .error:
            ErrorStateView(message: viewModel.errorMessage ?? "Something went wrong. Please try again.") {
                viewModel.dismissError()
            }
        }
    }
}
