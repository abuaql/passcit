import SwiftUI

/// Shared typed-answer control for every place the Interview simulation
/// accepts free text — Reading/Civics's typed fallback
/// (InterviewAnswerInputView) and Writing's typed-only dictation
/// (InterviewWritingView). Pulled out once rather than duplicated twice,
/// since both previously hand-rolled the identical TextField+Submit
/// pairing.
///
/// A card rather than a bare `.roundedBorder` field: padded background,
/// an accent-colored focus ring, and a full-width Submit button below
/// (not squeezed beside the field) so multiline answers have room and the
/// tap target stays comfortable at any Dynamic Type size.
struct TypedAnswerField: View {
    let placeholder: String
    @Binding var text: String
    var submitLabel: String = "Submit"
    let isSubmitting: Bool
    var onSubmit: () -> Void

    @FocusState private var isFocused: Bool

    private var trimmed: String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSubmit: Bool {
        !trimmed.isEmpty && !isSubmitting
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 10) {
            TextField(placeholder, text: $text, axis: .vertical)
                .font(.body)
                .lineLimit(2...6)
                .focused($isFocused)
                .padding(12)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .strokeBorder(isFocused ? Color.accentColor : Color.clear, lineWidth: 2)
                )
                .animation(.easeOut(duration: 0.15), value: isFocused)
                .disabled(isSubmitting)
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") { isFocused = false }
                    }
                }
                .accessibilityLabel(placeholder)

            Button(action: submit) {
                if isSubmitting {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                } else {
                    Label(submitLabel, systemImage: "arrow.up.circle.fill")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canSubmit)
        }
    }

    private func submit() {
        guard canSubmit else { return }
        isFocused = false
        onSubmit()
    }
}
