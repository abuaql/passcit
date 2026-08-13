import SwiftUI

struct LessonRowView: View {
    let lesson: RoadmapLesson
    var onTap: () -> Void = {}

    private var isLocked: Bool { lesson.status == .locked }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                statusIcon
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(lesson.title)
                        .font(.body.weight(.medium))
                        .foregroundStyle(isLocked ? .secondary : .primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if !isLocked {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(isLocked)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityAddTraits(isLocked ? [] : .isButton)
    }

    private var subtitle: String {
        switch lesson.status {
        case .locked: "Locked — finish the previous lesson first"
        case .available: "\(lesson.questionCount) questions"
        case .inProgress: "\(lesson.questionCount) questions — in progress"
        case .completed: "\(lesson.questionCount) questions — completed"
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch lesson.status {
        case .locked:
            Image(systemName: "lock.fill")
                .foregroundStyle(.secondary)
        case .available, .inProgress:
            Image(systemName: "circle")
                .foregroundStyle(.tint)
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
        }
    }

    private var accessibilityLabel: String {
        "\(lesson.title). \(subtitle)."
    }
}
