import Foundation

/// A savings goal. `linkType`/`linkId` point at the savings pot, business or
/// investing account that funds it, when one does.
struct Goal: Codable, Identifiable, Equatable, Sendable {
    let id: Int
    let name: String
    let target: Double
    let saved: Double
    let deadline: String?
    let linkType: String?
    let linkId: String?

    /// 0...1, clamped.
    var progress: Double {
        guard target > 0 else { return 0 }
        return min(max(saved / target, 0), 1)
    }

    enum CodingKeys: String, CodingKey {
        case id, name, target, saved, deadline, linkType, linkId
    }

    init(id: Int,
         name: String,
         target: Double,
         saved: Double = 0,
         deadline: String? = nil,
         linkType: String? = nil,
         linkId: String? = nil) {
        self.id = id
        self.name = name
        self.target = target
        self.saved = saved
        self.deadline = deadline
        self.linkType = linkType
        self.linkId = linkId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let id = container.decodeLooseInt(forKey: .id) else {
            throw DecodingError.dataCorruptedError(forKey: .id, in: container,
                                                   debugDescription: "Goal id is missing or not numeric.")
        }
        self.id = id
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        target = try container.decodeIfPresent(Double.self, forKey: .target) ?? 0
        saved = try container.decodeIfPresent(Double.self, forKey: .saved) ?? 0
        deadline = try container.decodeIfPresent(String.self, forKey: .deadline)
        linkType = try container.decodeIfPresent(String.self, forKey: .linkType)
        linkId = container.decodeLooseString(forKey: .linkId)
    }
}
