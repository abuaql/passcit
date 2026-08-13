import SwiftUI

struct MainTabView: View {
    let apiClient: APIClient
    var onSignInTapped: () -> Void

    // Lets Home's "Continue Learning" card switch to the Learn tab
    // programmatically — Learn's own resume card then takes over from
    // there, so this never needs to know which lesson/exam is next.
    @State private var selectedTab = Tab.home

    private enum Tab: Hashable {
        case home, learn, practice, interview, profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(apiClient: apiClient, onSignInTapped: onSignInTapped) {
                selectedTab = .learn
            }
            .tabItem { Label("Home", systemImage: "house.fill") }
            .tag(Tab.home)

            LearnView(apiClient: apiClient, onSignInTapped: onSignInTapped)
                .tabItem { Label("Learn", systemImage: "map.fill") }
                .tag(Tab.learn)

            PracticeView(apiClient: apiClient, onSignInTapped: onSignInTapped)
                .tabItem { Label("Practice", systemImage: "pencil.and.list.clipboard") }
                .tag(Tab.practice)

            InterviewView(apiClient: apiClient, onSignInTapped: onSignInTapped)
                .tabItem { Label("Interview", systemImage: "mic.fill") }
                .tag(Tab.interview)

            ProfileView(apiClient: apiClient)
                .tabItem { Label("Profile", systemImage: "person.fill") }
                .tag(Tab.profile)
        }
    }
}
