import Foundation

/// Supplies the Firebase ID token every authenticated route requires. The
/// server verifies it and derives the user from it; the client never asserts
/// its own identity.
protocol TokenProvider: Sendable {
    func idToken(forceRefresh: Bool) async throws -> String?
}

/// The one place HTTP happens. Builds the request, attaches the bearer token,
/// maps status codes to `APIError`, decodes the reply. Services sit on top and
/// know their own paths and payloads; views never see this type.
actor APIClient {
    private let environment: APIEnvironment
    private let session: URLSession
    private let tokenProvider: (any TokenProvider)?
    private let decoder = JSONDecoder()

    init(environment: APIEnvironment = .standard,
         tokenProvider: (any TokenProvider)? = nil,
         session: URLSession = .shared) {
        self.environment = environment
        self.tokenProvider = tokenProvider
        self.session = session
    }

    /// Sends the request and decodes a 2xx body as `Response`.
    func send<Response: Decodable>(_ request: APIRequest, as type: Response.Type = Response.self) async throws -> Response {
        let (data, _) = try await sendData(request)
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            Log.network.error("Decoding failed for \(request.path, privacy: .public)")
            throw APIError.decoding(String(describing: error))
        }
    }

    /// Sends the request and returns the raw 2xx body (207 included). Any
    /// other status is thrown as an `APIError`.
    func sendData(_ request: APIRequest) async throws -> (Data, HTTPURLResponse) {
        let urlRequest = try await makeURLRequest(request)
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch let urlError as URLError where urlError.code == .timedOut {
            throw APIError.timeout
        } catch {
            throw APIError.network(error.localizedDescription)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        Log.network.info("\(request.method.rawValue, privacy: .public) \(request.path, privacy: .public) -> \(http.statusCode)")
        guard (200..<300).contains(http.statusCode) else {
            throw APIClient.error(status: http.statusCode, data: data)
        }
        return (data, http)
    }

    private func makeURLRequest(_ request: APIRequest) async throws -> URLRequest {
        guard var components = URLComponents(url: environment.baseURL, resolvingAgainstBaseURL: false) else {
            throw APIError.invalidRequest
        }
        components.path = request.path
        if !request.query.isEmpty { components.queryItems = request.query }
        guard let url = components.url else {
            throw APIError.invalidRequest
        }

        var urlRequest = URLRequest(url: url, timeoutInterval: request.timeout)
        urlRequest.httpMethod = request.method.rawValue
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body = request.body {
            urlRequest.httpBody = body
            urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if request.requiresAuth {
            guard let provider = tokenProvider else { throw APIError.notConfigured }
            guard let token = try await provider.idToken(forceRefresh: false) else {
                throw APIError.unauthenticated
            }
            urlRequest.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        }
        return urlRequest
    }

    /// Status-to-error mapping, shared with services that read raw responses.
    nonisolated static func error(status: Int, data: Data) -> APIError {
        let envelope = try? JSONDecoder().decode(ServerErrorEnvelope.self, from: data)
        switch status {
        case 401:
            return .unauthenticated
        case 429:
            return .rateLimited
        case 504:
            return .timeout
        default:
            return .server(status: status,
                           code: envelope?.code ?? "http_\(status)",
                           message: envelope?.message ?? "The server returned an unexpected response (\(status)).")
        }
    }
}
