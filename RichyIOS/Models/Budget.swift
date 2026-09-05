import Foundation

/// A spending cap or savings target on one category (or one folder, when
/// `folderId` is set). `catId` is the key the web app merges on.
struct Budget: Codable, Identifiable, Equatable, Sendable {
    var id: String { catId }

    let catId: String
    let category: String?
    let limit: Double
    /// "cap" (spend no more than) or "target" (put aside at least).
    let dir: String?
    /// "shared" or "exclusive" - how a folder budget counts its categories.
    let mode: String?
    let folderId: String?
    let track: String?

    var isTarget: Bool { dir == "target" }

    enum CodingKeys: String, CodingKey {
        case catId, category, limit, dir, mode, folderId, track
    }

    init(catId: String,
         category: String? = nil,
         limit: Double,
         dir: String? = nil,
         mode: String? = nil,
         folderId: String? = nil,
         track: String? = nil) {
        self.catId = catId
        self.category = category
        self.limit = limit
        self.dir = dir
        self.mode = mode
        self.folderId = folderId
        self.track = track
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        catId = container.decodeLooseString(forKey: .catId) ?? ""
        category = try container.decodeIfPresent(String.self, forKey: .category)
        limit = try container.decodeIfPresent(Double.self, forKey: .limit) ?? 0
        dir = try container.decodeIfPresent(String.self, forKey: .dir)
        mode = try container.decodeIfPresent(String.self, forKey: .mode)
        folderId = container.decodeLooseString(forKey: .folderId)
        track = try container.decodeIfPresent(String.self, forKey: .track)
    }
}
