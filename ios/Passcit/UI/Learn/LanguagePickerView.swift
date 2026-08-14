import SwiftUI

/// Sheet-presented language picker — reachable from Learn's toolbar (see
/// LearnView) and shown once per selection change, matching the native
/// iOS Settings > Language-style picker rather than reproducing the old
/// web app's inline `<select>`.
struct LanguagePickerView: View {
    let store: StudyLanguageStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(StudyLanguage.allCases) { language in
                Button {
                    Task { await store.select(language) }
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(language.nativeName)
                                .font(.body)
                                .foregroundStyle(.primary)
                            if language.nativeName != language.englishName {
                                Text(language.englishName)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        Spacer()
                        if language == store.selectedLanguage {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.tint)
                        }
                    }
                }
                .accessibilityAddTraits(language == store.selectedLanguage ? [.isSelected] : [])
            }
            .navigationTitle("Study Language")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .safeAreaInset(edge: .bottom) {
                if store.syncFailed {
                    Text("Couldn't sync your language choice — it's still applied on this device.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(.thinMaterial)
                }
            }
        }
    }
}
