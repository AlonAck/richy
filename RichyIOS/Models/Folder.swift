import Foundation

/// A group of categories with a budgeting role: "need", "want", "savings" or
/// "none". Folders are what the needs/wants/savings split is computed over.
struct Folder: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let color: String?
    let icon: String?
    let role: String?
    let rule: String?

    enum CodingKeys: String, CodingKey {
        case id, name, color, icon, role, rule
    }

    init(id: String, name: String, color: String? = nil, icon: String? = nil, role: String? = nil, rule: String? = nil) {
        self.id = id
        self.name = name
        self.color = color
        self.icon = icon
        self.role = role
        self.rule = rule
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = container.decodeLooseString(forKey: .id) ?? ""
        name = try container.decodeIfPresent(String.self, forKey: .name) ?? ""
        color = try container.decodeIfPresent(String.self, forKey: .color)
        icon = try container.decodeIfPresent(String.self, forKey: .icon)
        role = try container.decodeIfPresent(String.self, forKey: .role)
        rule = try container.decodeIfPresent(String.self, forKey: .rule)
    }
}
