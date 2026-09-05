import Foundation

/// One call to the Richy API. Bodies are pre-encoded so the request is a plain
/// value that can cross into the `APIClient` actor.
struct APIRequest: Sendable {
    enum Method: String, Sendable {
        case get = "GET"
        case post = "POST"
    }

    var method: Method
    var path: String
    var query: [URLQueryItem] = []
    var body: Data? = nil
    var requiresAuth: Bool = true
    var timeout: TimeInterval = 60

    static func get(_ path: String, query: [URLQueryItem] = [], requiresAuth: Bool = true) -> APIRequest {
        APIRequest(method: .get, path: path, query: query, requiresAuth: requiresAuth)
    }

    static func post(_ path: String, requiresAuth: Bool = true, timeout: TimeInterval = 60) -> APIRequest {
        APIRequest(method: .post, path: path, requiresAuth: requiresAuth, timeout: timeout)
    }

    static func post<Body: Encodable>(_ path: String,
                                      json body: Body,
                                      requiresAuth: Bool = true,
                                      timeout: TimeInterval = 60) throws -> APIRequest {
        var request = APIRequest(method: .post, path: path, requiresAuth: requiresAuth, timeout: timeout)
        request.body = try JSONEncoder().encode(body)
        return request
    }
}
