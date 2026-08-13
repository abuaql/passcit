import SwiftUI

// Static, illustrative preview only — no live data. Real unlocking
// mechanics come from GET /api/roadmap in a later phase.
struct RoadmapTeaserView: View {
    private let units: [(title: String, locked: Bool)] = [
        ("Unit 1 — American Government", false),
        ("Unit 2 — American History", true),
        ("Unit 3 — Integrated Civics", true),
    ]

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                Text("Learn Step by Step")
                    .font(.title.bold())
                    .multilineTextAlignment(.center)
                Text("Pass each unit's exam to unlock the next.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 24)

            Spacer()

            VStack(spacing: 0) {
                ForEach(Array(units.enumerated()), id: \.offset) { index, unit in
                    HStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(unit.locked ? Color(.systemGray5) : Color.accentColor)
                                .frame(width: 44, height: 44)
                            Image(systemName: unit.locked ? "lock.fill" : "checkmark")
                                .foregroundStyle(unit.locked ? Color.secondary : Color.white)
                        }

                        Text(unit.title)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(unit.locked ? .secondary : .primary)

                        Spacer()
                    }

                    if index < units.count - 1 {
                        Rectangle()
                            .fill(Color(.systemGray5))
                            .frame(width: 2, height: 24)
                            .padding(.leading, 21)
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
    RoadmapTeaserView()
}
