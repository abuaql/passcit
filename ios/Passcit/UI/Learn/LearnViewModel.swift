import Foundation
import Observation

// Where a NavigationStack push should land — built from the roadmap's
// own resumeTarget or from tapping a specific row.
enum LearnRoute: Hashable {
    case lesson(id: String)
    case unitExam(unitId: String)
}

struct ResumeSummary: Equatable {
    let title: String
    let subtitle: String
    let route: LearnRoute
}

@Observable
final class LearnViewModel {
    private(set) var roadmap: Roadmap?
    private(set) var isLoading = false
    private(set) var errorMessage: String?

    private let learnService: LearnServicing
    private var testVersionId: String?

    init(learnService: LearnServicing) {
        self.learnService = learnService
    }

    func loadIfNeeded() async {
        guard roadmap == nil else { return }
        await load()
    }

    func refresh() async {
        await load()
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let versionId = try await resolvedTestVersionId()
            roadmap = try await learnService.fetchRoadmap(testVersionId: versionId)
        } catch let error as APIClientError {
            errorMessage = error.userMessage
        } catch let error as LearnServiceError {
            errorMessage = error.message
        } catch {
            errorMessage = "Something went wrong. Please try again."
        }
    }

    private func resolvedTestVersionId() async throws -> String {
        if let testVersionId { return testVersionId }
        let id = try await learnService.resolveTargetTestVersionId()
        testVersionId = id
        return id
    }

    // The unit a locked unit's banner should point to as "complete this
    // unit's exam to unlock" — the previous unit in display order.
    func previousUnitTitle(before unit: RoadmapUnit) -> String? {
        Self.previousUnitTitle(before: unit, in: roadmap?.units ?? [])
    }

    static func previousUnitTitle(before unit: RoadmapUnit, in units: [RoadmapUnit]) -> String? {
        guard let index = units.firstIndex(where: { $0.id == unit.id }), index > 0 else { return nil }
        return units[index - 1].title
    }

    // Pure so it's directly testable without a mock service — resolves
    // the backend's resumeTarget into something the "Continue Learning"
    // card can render and navigate from.
    static func resumeSummary(for roadmap: Roadmap) -> ResumeSummary? {
        guard let target = roadmap.resumeTarget else { return nil }
        switch target {
        case .lesson(let unitId, let lessonId):
            guard let unit = roadmap.units.first(where: { $0.id == unitId }),
                  let lesson = unit.lessons.first(where: { $0.id == lessonId }) else { return nil }
            return ResumeSummary(title: lesson.title, subtitle: unit.title, route: .lesson(id: lesson.id))
        case .exam(let unitId):
            guard let unit = roadmap.units.first(where: { $0.id == unitId }) else { return nil }
            return ResumeSummary(title: "\(unit.title) Exam", subtitle: "Every lesson is done — you're ready.", route: .unitExam(unitId: unit.id))
        }
    }

    var resumeSummary: ResumeSummary? {
        roadmap.map { Self.resumeSummary(for: $0) } ?? nil
    }
}
