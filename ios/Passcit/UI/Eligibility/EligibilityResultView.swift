import SwiftUI

/// Renders the server's EligibilityResult verbatim — readinessScore,
/// dates, and every warning/recommendation code come from the response
/// exactly as calculated; this view only maps codes to display text, it
/// never derives or second-guesses a value itself.
struct EligibilityResultView: View {
    let result: EligibilityResult
    var onStartNew: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                readinessCard

                if result.isMilitaryPath {
                    militaryNotice
                } else {
                    detailsCard
                }

                if !result.warnings.isEmpty {
                    codeListCard(title: "Warnings", tint: .orange, items: result.warnings.map(Self.warningText))
                }
                if !result.recommendations.isEmpty {
                    codeListCard(title: "Recommendations", tint: .accentColor, items: result.recommendations.map(Self.recommendationText))
                }

                Text("This is an estimate only and is not a legal determination. For questions about your specific situation, consult USCIS or an immigration attorney.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button("Start New Calculation", action: onStartNew)
                    .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .navigationTitle("Your Results")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var readinessCard: some View {
        VStack(spacing: 8) {
            Text("\(result.readinessScore)%")
                .font(.system(size: 56, weight: .bold))
                .foregroundStyle(result.isEligibleNow ? .green : .primary)
            Text(result.isEligibleNow ? "You appear eligible to file now" : "Readiness Score")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }

    private var militaryNotice: some View {
        Text("Eligibility through military service (INA 328/329) depends on discharge characterization and service dates that USCIS evaluates case by case. This tool doesn't calculate a filing date for this path — see the recommendations below.")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var detailsCard: some View {
        VStack(spacing: 12) {
            detailRow("Eligibility Date", result.eligibilityDate.formatted(date: .abbreviated, time: .omitted))
            detailRow("Earliest Filing Date", result.earliestFilingDate.formatted(date: .abbreviated, time: .omitted))
            detailRow("Physical Presence", "\(result.physicalPresenceDaysActual) of \(result.physicalPresenceDaysReq) days")
            detailRow("Days Outside U.S.", "\(result.totalDaysOutsideUS)")
            detailRow("Longest Trip", "\(result.longestTripDays) days")
            detailRow("Continuous Residence", result.continuousResidenceOk ? "OK" : continuousResidenceRiskText(result.continuousResidenceRisk))
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func detailRow(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    private func codeListCard(title: String, tint: Color, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)
            ForEach(items, id: \.self) { item in
                Label(item, systemImage: "circle.fill")
                    .labelStyle(.titleOnly)
                    .font(.subheadline)
                    .foregroundStyle(tint)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private func continuousResidenceRiskText(_ risk: ContinuousResidenceRisk) -> String {
        switch risk {
        case .none: "OK"
        case .review: "At risk — review needed"
        case .likelyBroken: "Likely broken"
        }
    }

    static func warningText(_ code: EligibilityWarningCode) -> String {
        switch code {
        case .longAbsenceReview: "A single trip of 180–364 days creates a rebuttable risk that continuous residence was broken."
        case .longAbsenceLikelyBroken: "A single trip of 365+ days likely breaks continuous residence, absent a preserved-residence filing."
        case .physicalPresenceShortfall: "Your projected days outside the U.S. exceed what's allowed for physical presence."
        case .militaryReviewRequired: "Military-service eligibility is always reviewed case by case by USCIS."
        case .selectiveServiceNotRegistered: "Selective Service registration is required but you indicated you haven't registered."
        case .selectiveServiceUnknown: "Selective Service registration is required, but your registration status wasn't provided."
        case .under18: "You must be 18 or older to file Form N-400, regardless of residency."
        case .goodMoralCharacterConcern: "You flagged a possible good-moral-character concern to discuss with USCIS or an attorney."
        case .stateResidencyShortfall: "You may not have lived in your filing state for the required 3 months."
        }
    }

    static func recommendationText(_ code: EligibilityRecommendationCode) -> String {
        switch code {
        case .beginCivicsStudy: "Begin studying the civics test with Learn."
        case .startInterviewPractice: "Start rehearsing with Interview practice."
        case .gatherTravelDocs: "Gather travel documents for your trips outside the U.S."
        case .reviewSelectiveService: "Review your Selective Service registration status."
        case .consultUSCISMilitary: "Consult USCIS or an immigration attorney about military-service eligibility."
        case .waitForEligibilityDate: "Wait until your eligibility date before filing."
        case .gatherMarriageDocs: "Gather documents proving your marriage and your spouse's citizenship."
        }
    }
}
