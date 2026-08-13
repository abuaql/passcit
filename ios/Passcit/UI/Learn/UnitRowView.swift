import SwiftUI

struct UnitRowView: View {
    let unit: RoadmapUnit
    let previousUnitTitle: String?
    var onSelectLesson: (RoadmapLesson) -> Void = { _ in }
    var onSelectExam: () -> Void = {}

    private var isLocked: Bool { unit.status == .locked }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header

            if isLocked {
                lockedBanner
            } else {
                VStack(spacing: 4) {
                    ForEach(unit.lessons) { lesson in
                        LessonRowView(lesson: lesson) { onSelectLesson(lesson) }
                        if lesson.id != unit.lessons.last?.id {
                            Divider()
                        }
                    }
                    Divider()
                    examRow
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(unit.title)
                    .font(.headline)
                if let description = unit.description {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            statusBadge
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        switch unit.status {
        case .completed:
            Label("Completed", systemImage: "checkmark.circle.fill")
                .labelStyle(.iconOnly)
                .foregroundStyle(.green)
                .accessibilityLabel("Unit completed")
        case .locked:
            Image(systemName: "lock.fill")
                .foregroundStyle(.secondary)
                .accessibilityLabel("Unit locked")
        case .available, .inProgress:
            EmptyView()
        }
    }

    private var lockedBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "lock.fill")
                .foregroundStyle(.secondary)
            Text(lockedReason)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }

    private var lockedReason: String {
        if let previousUnitTitle {
            "Pass the \(previousUnitTitle) exam to unlock this unit."
        } else {
            "This unit is locked."
        }
    }

    private var examRow: some View {
        let status: ProgressStatus = unit.examPassed ? .completed : (unit.examAvailable ? .available : .locked)
        let subtitle: String = unit.examPassed
            ? "Passed"
            : (unit.examAvailable ? "Ready to take" : "Complete every lesson to unlock")

        return Button {
            onSelectExam()
        } label: {
            HStack(spacing: 12) {
                examStatusIcon(status)
                    .frame(width: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Unit Exam")
                        .font(.body.weight(.medium))
                        .foregroundStyle(status == .locked ? .secondary : .primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if status != .locked {
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(status == .locked)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Unit Exam. \(subtitle).")
    }

    @ViewBuilder
    private func examStatusIcon(_ status: ProgressStatus) -> some View {
        switch status {
        case .locked:
            Image(systemName: "lock.fill").foregroundStyle(.secondary)
        case .completed:
            Image(systemName: "checkmark.seal.fill").foregroundStyle(.green)
        default:
            Image(systemName: "doc.text.magnifyingglass").foregroundStyle(.tint)
        }
    }
}
