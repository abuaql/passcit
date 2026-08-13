import SwiftUI

/// Shared question-and-options display for both lesson practice and the
/// unit exam. `correctOptions` distinguishes the two modes: non-nil
/// reveals correctness immediately on selection (lesson practice, which
/// the server never grades), nil never reveals anything (the exam,
/// which only the server grades, only after every question is
/// submitted).
struct LearnQuestionView: View {
    let questionText: String
    let progressText: String
    let options: [String]
    let selectedOption: String?
    let correctOptions: Set<String>?
    let onSelect: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text(progressText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .accessibilityLabel(progressText)

            Text(questionText)
                .font(.title3.bold())
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)

            VStack(spacing: 12) {
                ForEach(options, id: \.self) { option in
                    optionButton(option)
                }
            }
        }
    }

    @ViewBuilder
    private func optionButton(_ option: String) -> some View {
        let isSelected = option == selectedOption
        let isRevealing = correctOptions != nil && isSelected
        let isCorrect = correctOptions?.contains(option) == true

        Button {
            onSelect(option)
        } label: {
            HStack {
                Text(option)
                    .multilineTextAlignment(.leading)
                Spacer()
                if isRevealing {
                    Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(isCorrect ? .green : .red)
                } else if isSelected {
                    Image(systemName: "circle.inset.filled")
                        .foregroundStyle(.tint)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(optionBackground(isSelected: isSelected, isRevealing: isRevealing, isCorrect: isCorrect))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(optionBorder(isSelected: isSelected, isRevealing: isRevealing, isCorrect: isCorrect), lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel(for: option, isSelected: isSelected, isRevealing: isRevealing, isCorrect: isCorrect))
    }

    private func optionBackground(isSelected: Bool, isRevealing: Bool, isCorrect: Bool) -> Color {
        if isRevealing {
            return (isCorrect ? Color.green : Color.red).opacity(0.15)
        }
        return isSelected ? Color.accentColor.opacity(0.12) : Color(.secondarySystemBackground)
    }

    private func optionBorder(isSelected: Bool, isRevealing: Bool, isCorrect: Bool) -> Color {
        if isRevealing {
            return isCorrect ? .green : .red
        }
        return isSelected ? Color.accentColor : Color.clear
    }

    private func accessibilityLabel(for option: String, isSelected: Bool, isRevealing: Bool, isCorrect: Bool) -> String {
        var parts = [option]
        if isRevealing {
            parts.append(isCorrect ? "correct answer" : "incorrect")
        } else if isSelected {
            parts.append("selected")
        }
        return parts.joined(separator: ", ")
    }
}
