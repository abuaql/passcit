import SwiftUI

struct ProductIntroView: View {
    private let features: [(icon: String, title: String, subtitle: String)] = [
        ("map.fill", "Guided Roadmap", "Move through structured lessons, unit by unit, in the right order."),
        ("pencil.and.list.clipboard", "Practice Tests", "Sharpen your knowledge with quizzes built around your weak areas."),
        ("mic.fill", "Interview Simulation", "Rehearse the real naturalization interview before test day."),
    ]

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            VStack(alignment: .leading, spacing: 28) {
                ForEach(features, id: \.title) { feature in
                    HStack(alignment: .top, spacing: 16) {
                        Image(systemName: feature.icon)
                            .font(.title2)
                            .foregroundStyle(.tint)
                            .frame(width: 36)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(feature.title)
                                .font(.headline)
                            Text(feature.subtitle)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .padding(.horizontal, 8)

            Spacer()
            Spacer()
        }
        .padding(32)
    }
}

#Preview {
    ProductIntroView()
}
