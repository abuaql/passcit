import SwiftUI

struct InterviewDetailView: View {
    @State private var viewModel: InterviewDetailViewModel

    init(apiClient: APIClient, interviewId: String) {
        _viewModel = State(initialValue: InterviewDetailViewModel(
            interviewId: interviewId,
            interviewService: InterviewService(apiClient: apiClient)
        ))
    }

    var body: some View {
        content
            .navigationTitle("Interview Detail")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadIfNeeded() }
    }

    @ViewBuilder
    private var content: some View {
        if let detail = viewModel.detail {
            detailContent(detail)
        } else if let errorMessage = viewModel.errorMessage {
            ErrorStateView(message: errorMessage) {
                Task { await viewModel.loadIfNeeded() }
            }
        } else {
            LoadingView()
        }
    }

    private func detailContent(_ detail: InterviewDetail) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                header(detail)

                VStack(spacing: 12) {
                    sectionRow(title: "Reading", result: detail.readingResult)
                    sectionRow(title: "Writing", result: detail.writingResult)
                    sectionRow(title: "Civics", result: detail.civicsResult)
                }
                .padding()
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))

                if !detail.categoryPerformance.isEmpty {
                    categoryBreakdown(detail.categoryPerformance)
                }
            }
            .padding()
        }
    }

    private func header(_ detail: InterviewDetail) -> some View {
        VStack(spacing: 8) {
            Image(systemName: detail.passed == true ? "checkmark.seal.fill" : "xmark.seal.fill")
                .font(.system(size: 48))
                .foregroundStyle(detail.passed == true ? .green : .red)
            Text(detail.startedAt.formatted(date: .abbreviated, time: .shortened))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("\(detail.civicsCorrectCount) of \(detail.civicsCorrectCount + detail.civicsIncorrectCount) civics questions correct.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private func sectionRow(title: String, result: InterviewSectionResult) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(label(for: result))
                .font(.subheadline.bold())
                .foregroundStyle(color(for: result))
        }
        .accessibilityElement(children: .combine)
    }

    // categoryPerformance is rendered in the exact order the server sends
    // it (weakest-first aggregation, src/lib/interview.ts) — never
    // resorted or recomputed client-side.
    private func categoryBreakdown(_ categories: [CategoryPerformance]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Category Performance")
                .font(.headline)
            ForEach(categories, id: \.category) { category in
                HStack {
                    Text(category.category)
                        .font(.subheadline)
                    Spacer()
                    Text("\(category.correct)/\(category.total) (\(category.accuracyPercent)%)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
    }

    private func label(for result: InterviewSectionResult) -> String {
        switch result {
        case .passed: return "Passed"
        case .failed: return "Failed"
        case .notReached: return "Not Reached"
        }
    }

    private func color(for result: InterviewSectionResult) -> Color {
        switch result {
        case .passed: return .green
        case .failed: return .red
        case .notReached: return .secondary
        }
    }
}
