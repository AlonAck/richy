import Foundation

/// Everything that can go wrong talking to the API, with the copy a person
/// should see. Messages mirror the web app's wording for the same cases.
enum APIError: Error, LocalizedError, Equatable, Sendable {
    case notConfigured
    case unauthenticated
    case rateLimited
    case timeout
    case invalidRequest
    case invalidResponse
    case network(String)
    case decoding(String)
    case server(status: Int, code: String, message: String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Richy isn't connected to its backend on this device yet."
        case .unauthenticated:
            return "Your session expired. Sign in again."
        case .rateLimited:
            return "Richard needs a short breather - try again in a few minutes."
        case .timeout:
            return "That took too long. Check your connection and try again."
        case .invalidRequest:
            return "That request couldn't be built."
        case .invalidResponse:
            return "The server sent something Richy couldn't read."
        case .network:
            return "Richy couldn't reach the server. Check your connection and try again."
        case .decoding:
            return "The server's reply didn't look the way Richy expected."
        case .server(_, _, let message):
            return message
        }
    }
}
