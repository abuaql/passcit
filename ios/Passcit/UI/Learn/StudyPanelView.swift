import SwiftUI

/// Explanation / Translation / Memory Tip / Listen for one question —
/// embedded below the answer options in LessonView. Always constructed
/// with `.id(question.id)` by the caller so its @State ViewModel resets
/// cleanly on every question change.
struct StudyPanelView: View {
    let officialQuestion: String
    let officialAnswer: String
    let language: StudyLanguage
    @State private var viewModel: StudyPanelViewModel

    init(questionId: String, officialQuestion: String, officialAnswer: String, language: StudyLanguage, apiClient: APIClient) {
        self.officialQuestion = officialQuestion
        self.officialAnswer = officialAnswer
        self.language = language
        _viewModel = State(initialValue: StudyPanelViewModel(questionId: questionId, service: StudyContentService(apiClient: apiClient)))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Study")
                    .font(.subheadline.bold())
                Spacer()
                listenButton
            }

            if viewModel.devMode {
                Label("Development Mode — sample content until GEMINI_API_KEY is set", systemImage: "flask")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }

            VStack(spacing: 8) {
                sectionRow(.explanation, title: "Explanation", icon: "text.book.closed.fill")
                sectionRow(.translation, title: "Translation", icon: "globe")
                sectionRow(.memoryTip, title: "Memory Tip", icon: "lightbulb.fill")
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var listenButton: some View {
        Button {
            Task { await viewModel.toggleListen(officialQuestion: officialQuestion, officialAnswer: officialAnswer, language: language) }
        } label: {
            Label(viewModel.isSpeaking ? "Stop" : "Listen", systemImage: viewModel.isSpeaking ? "stop.circle.fill" : "speaker.wave.2.fill")
                .font(.caption.bold())
        }
        .buttonStyle(.bordered)
        .tint(viewModel.isSpeaking ? .red : .accentColor)
        .accessibilityLabel(viewModel.isSpeaking ? "Stop listening" : "Listen")
    }

    @ViewBuilder
    private func sectionRow(_ kind: StudyContentKind, title: String, icon: String) -> some View {
        let isExpanded = viewModel.expandedSection == kind
        VStack(alignment: .leading, spacing: 10) {
            Button {
                Task { await viewModel.toggle(kind, language: language) }
            } label: {
                HStack {
                    Image(systemName: icon)
                        .frame(width: 22)
                        .foregroundStyle(.tint)
                    Text(title)
                        .font(.subheadline.bold())
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(.primary)
            .accessibilityAddTraits(isExpanded ? [.isSelected] : [])

            if isExpanded {
                sectionContent(kind)
                    .environment(\.layoutDirection, language.rtl ? .rightToLeft : .leftToRight)
                    .multilineTextAlignment(language.rtl ? .trailing : .leading)
                    .frame(maxWidth: .infinity, alignment: language.rtl ? .trailing : .leading)
            }
        }
        .padding(12)
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    @ViewBuilder
    private func sectionContent(_ kind: StudyContentKind) -> some View {
        switch viewModel.status(for: kind) {
        case .idle:
            EmptyView()
        case .loading:
            HStack {
                Spacer()
                ProgressView()
                Spacer()
            }
            .padding(.vertical, 4)
        case .ready:
            readyContent(kind)
        case .error(let message):
            VStack(alignment: .leading, spacing: 8) {
                Text(message)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Button("Retry") { Task { await viewModel.retry(language: language) } }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
            }
        }
    }

    @ViewBuilder
    private func readyContent(_ kind: StudyContentKind) -> some View {
        switch kind {
        case .explanation:
            Text(viewModel.explanationText ?? "")
                .font(.subheadline)
        case .memoryTip:
            Text(viewModel.memoryTipText ?? "")
                .font(.subheadline)
        case .translation:
            VStack(alignment: .leading, spacing: 8) {
                if let translatedQuestion = viewModel.translatedQuestion {
                    Text(translatedQuestion)
                        .font(.subheadline.bold())
                }
                if let translatedAnswer = viewModel.translatedAnswer {
                    Text(translatedAnswer)
                        .font(.subheadline)
                }
                Text("The official USCIS question and answer are always in English, regardless of translation.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
