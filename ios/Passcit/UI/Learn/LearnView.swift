import SwiftUI

struct LearnView: View {
    @Environment(AuthManager.self) private var authManager
    private let apiClient: APIClient
    @State private var viewModel: LearnViewModel
    @State private var studyLanguageStore: StudyLanguageStore
    @State private var path: [LearnRoute] = []
    @State private var showLanguagePicker = false
    var onSignInTapped: () -> Void

    init(apiClient: APIClient, onSignInTapped: @escaping () -> Void) {
        self.apiClient = apiClient
        _viewModel = State(initialValue: LearnViewModel(learnService: LearnService(apiClient: apiClient)))
        _studyLanguageStore = State(initialValue: StudyLanguageStore(studyContentService: StudyContentService(apiClient: apiClient)))
        self.onSignInTapped = onSignInTapped
    }

    var body: some View {
        NavigationStack(path: $path) {
            authGatedContent
                .navigationTitle("Learn")
                .navigationDestination(for: LearnRoute.self) { route in
                    destination(for: route)
                }
                .toolbar {
                    if case .signedIn = authManager.state {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button {
                                showLanguagePicker = true
                            } label: {
                                Image(systemName: "globe")
                            }
                            .accessibilityLabel("Study language: \(studyLanguageStore.selectedLanguage.englishName)")
                        }
                    }
                }
                .sheet(isPresented: $showLanguagePicker) {
                    LanguagePickerView(store: studyLanguageStore)
                }
        }
        .task(id: authManager.state) {
            if case .signedIn(let user) = authManager.state {
                studyLanguageStore.adopt(from: user)
            }
        }
    }

    @ViewBuilder
    private var authGatedContent: some View {
        switch authManager.state {
        case .bootstrapping:
            LoadingView()
        case .signedOut:
            signedOutPrompt
        case .signedIn:
            content
        }
    }

    private var signedOutPrompt: some View {
        VStack(spacing: 16) {
            Image(systemName: "map.fill")
                .font(.system(size: 48))
                .foregroundStyle(.tint)
            Text("Sign in to learn")
                .font(.title3.bold())
            Text("Sign in to track your progress through the citizenship roadmap.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Sign In / Register", action: onSignInTapped)
                .buttonStyle(.borderedProminent)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var content: some View {
        if let roadmap = viewModel.roadmap {
            ScrollView {
                VStack(spacing: 16) {
                    if let resume = viewModel.resumeSummary {
                        resumeCard(resume)
                    }
                    ForEach(roadmap.units) { unit in
                        UnitRowView(
                            unit: unit,
                            previousUnitTitle: viewModel.previousUnitTitle(before: unit),
                            onSelectLesson: { lesson in path.append(.lesson(id: lesson.id)) },
                            onSelectExam: { path.append(.unitExam(unitId: unit.id)) }
                        )
                    }
                }
                .padding()
            }
            .refreshable {
                await viewModel.refresh()
            }
        } else if let errorMessage = viewModel.errorMessage {
            ErrorStateView(message: errorMessage) {
                Task { await viewModel.refresh() }
            }
        } else {
            LoadingView()
                .task { await viewModel.loadIfNeeded() }
        }
    }

    private func resumeCard(_ resume: ResumeSummary) -> some View {
        Button {
            path.append(resume.route)
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                Text("Continue Learning")
                    .font(.headline)
                Text(resume.title)
                    .font(.title3.bold())
                Text(resume.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.accentColor.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Continue Learning. \(resume.title). \(resume.subtitle)")
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder
    private func destination(for route: LearnRoute) -> some View {
        switch route {
        case .lesson(let id):
            LessonView(apiClient: apiClient, lessonId: id, studyLanguageStore: studyLanguageStore) {
                path.removeLast()
                Task { await viewModel.refresh() }
            }
        case .unitExam(let unitId):
            let unitTitle = viewModel.roadmap?.units.first(where: { $0.id == unitId })?.title ?? "Unit"
            UnitExamView(apiClient: apiClient, unitId: unitId, unitTitle: unitTitle) {
                path.removeLast()
                Task { await viewModel.refresh() }
            }
        }
    }
}
