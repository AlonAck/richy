import Foundation

/// Where the Vercel API lives. `baseURL` is an origin - scheme and host only;
/// request paths are absolute (`/api/chat`).
enum APIEnvironment: Equatable, Sendable {
    case production
    case custom(URL)

    static let standard = APIEnvironment.production

    var baseURL: URL {
        switch self {
        case .production:
            return URL(string: "https://richy-mgkl.vercel.app")!
        case .custom(let url):
            return url
        }
    }

    var displayName: String {
        switch self {
        case .production: return "Production"
        case .custom(let url): return url.host ?? url.absoluteString
        }
    }
}
