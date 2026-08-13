import SwiftUI

struct HomeView: View {
    @Environment(AuthManager.self) private var authManager
    @State private var viewModel: HomeViewModel
    var onSignInTapped: () -> Void
    var onContinueLearningTapped: () -> Void

    init(apiClient: APIClient, onSignInTapped: @escaping () -> Void, onContinueLearningTapped: @escaping () -> Void) {
        _viewModel = State(initialValue: HomeViewModel(dashboardService: DashboardService(apiClient: apiClient)))
        self.onSignInTapped = onSignInTapped
        self.onContinueLearningTapped = onContinueLearningTapped
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Home")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch authManager.state {
        case .bootstrapping:
            LoadingView()
        case .signedOut:
            signedOutPrompt
        case .signedIn(let user):
            signedInContent(user: user)
        }
    }

    private var signedOutPrompt: some View {
        VStack(spacing: 16) {
            Text("Sign in to see your progress")
                .font(.title3.bold())
            Text("Track lessons, streaks, and XP once you're signed in.")
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
    private func signedInContent(user: User) -> some View {
        if let dashboard = viewModel.dashboard {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Hi, \(user.name ?? "there")")
                        .font(.largeTitle.bold())

                    continueLearningCard(dashboard.resume)
                    dailyGoalCard(dashboard.dailyGoal)
                    statsGrid(dashboard.stats, totalXP: dashboard.xp.totalXP)
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

    private func continueLearningCard(_ resume: ResumeTarget?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Continue Learning")
                .font(.headline)
            Text(resumeDescription(resume))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button("Continue", action: onContinueLearningTapped)
                .buttonStyle(.borderedProminent)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func resumeDescription(_ resume: ResumeTarget?) -> String {
        switch resume {
        case .lesson: "Pick up your next lesson."
        case .unitExam: "You're ready for a unit exam."
        case nil: "Start your first lesson."
        }
    }

    private func dailyGoalCard(_ goal: DailyGoal) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Daily Goal")
                    .font(.headline)
                Spacer()
                if goal.met {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
            }
            ProgressView(value: Double(goal.progress), total: Double(max(goal.target, 1)))
            Text("\(goal.progress) / \(goal.target) questions today")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func statsGrid(_ stats: DashboardStats, totalXP: Int) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
            statCard(icon: "flame.fill", title: "Streak", value: "\(stats.currentStreak) days")
            statCard(icon: "star.fill", title: "XP", value: "\(totalXP)")
            statCard(icon: "checkmark.circle.fill", title: "Questions", value: "\(stats.questionsCompleted)/\(stats.totalQuestions)")
            statCard(icon: "scope", title: "Accuracy", value: stats.accuracyPercent.map { "\($0)%" } ?? "—")
        }
    }

    private func statCard(icon: String, title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon)
                .foregroundStyle(.tint)
            Text(value)
                .font(.title2.bold())
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
