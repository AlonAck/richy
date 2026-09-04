import Foundation

/// A spending category. Built-in ids look like "c7"; user-made ones are the
/// web app's `Date.now()` numbers, so the id is decoded loosely to a string.
struct Category: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let color: String?
    let icon: String?
    let folderId: String?

    enum CodingKeys: String, CodingKey {
        case id, name, color, icon, folderId
    }

    init(id: String, name: String, color: String? = nil, icon: String? = nil, folderId: String? = nil) {
        self.id = id
        self.name = name
        self.color = color
        self.icon = icon
        self.folderId = folderId
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = container.decodeLooseString(forKey: .id) ?? ""
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        color = try container.decodeIfPresent(String.self, forKey: .color)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        folderId = container.decodeLooseString(forKey: .folderId)
    }
}
