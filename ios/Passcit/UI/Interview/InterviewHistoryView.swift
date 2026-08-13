import SwiftUI

struct InterviewHistoryView: View {
    let apiClient: APIClient
    @State private var viewModel: InterviewHistoryViewModel

    init(apiClient: APIClient) {
        self.apiClient = apiClient
        _viewModel = State(initialValue: InterviewHistoryViewModel(interviewService: InterviewService(apiClient: apiClient)))
    }

    var body: some View {
        content
            .navigationTitle("Past Interviews")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadIfNeeded() }
    }

    @ViewBuilder
    private var content: some View {
        if let entries = viewModel.entries {
            if entries.isEmpty {
                EmptyStateView(
                    icon: "clock.arrow.circlepath",
                    title: "No interviews yet",
                    subtitle: "Completed interview simulations will show up here."
                )
            } else {
                List(entries) { entry in
                    NavigationLink {
                        InterviewDetailView(apiClient: apiClient, interviewId: entry.id)
                    } label: {
                        InterviewHistoryRowView(entry: entry)
                    }
                }
                .refreshable { await viewModel.refresh() }
            }
        } else if let errorMessage = viewModel.errorMessage {
            ErrorStateView(message: errorMessage) {
                Task { await viewModel.refresh() }
            }
        } else {
            LoadingView()
        }
    }
}

private struct InterviewHistoryRowView: View {
    let entry: InterviewHistoryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(entry.startedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.subheadline.bold())
                Spacer()
                statusBadge
            }
            Text(entry.testVersion.name)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var statusBadge: some View {
        switch entry.passed {
        case .some(true):
            Label("Passed", systemImage: "checkmark.circle.fill")
                .font(.caption.bold())
                .foregroundStyle(.green)
        case .some(false):
            Label("Failed", systemImage: "xmark.circle.fill")
                .font(.caption.bold())
                .foregroundStyle(.red)
        case .none:
            Text("Incomplete")
                .font(.caption.bold())
                .foregroundStyle(.secondary)
        }
    }
}
