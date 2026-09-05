import Foundation
import CryptoKit
import Security

/// The one-time nonce Sign in with Apple needs: a random string sent to
/// Apple as its SHA-256, then handed to Firebase raw so it can prove the
/// identity token was minted for this very request.
enum Nonce {
    static func random(length: Int = 32) -> String {
        let alphabet = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        result.reserveCapacity(length)
        while result.count < length {
            var byte: UInt8 = 0
            let status = SecRandomCopyBytes(kSecRandomDefault, 1, &byte)
            if status != errSecSuccess {
                byte = UInt8.random(in: 0...255)
            }
            if byte < alphabet.count {
                result.append(alphabet[Int(byte)])
            }
        }
        return result
    }

    static func sha256(_ input: String) -> String {
        let digest = SHA256.hash(data: Data(input.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
