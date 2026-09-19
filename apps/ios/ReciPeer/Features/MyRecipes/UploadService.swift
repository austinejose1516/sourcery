import Foundation

/// Presigns an R2 key then uploads bytes directly to R2 (never through the API).
/// Mirrors features/recipes/api.ts uploadFile.
enum UploadService {
    struct PresignResponse: Decodable {
        let key: String
        let url: String
    }

    static func presign(ext: String) async throws -> PresignResponse {
        struct Body: Encodable { let ext: String }
        return try await APIClient.post("/uploads/presign", body: Body(ext: ext))
    }

    /// PUT bytes straight to the presigned URL. Progress via AsyncBytes is not
    /// exposed, so for large files call `putStreaming` instead.
    static func put(url: URL, data: Data, contentType: String) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = data
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw ApiError(message: "Upload failed (\(status))", status: status)
        }
    }

    /// Upload with byte-level progress via an upload task + delegate.
    static func putWithProgress(
        url: URL,
        fileURL: URL,
        contentType: String,
        onProgress: @Sendable @escaping (Double) -> Void,
    ) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        let delegate = ProgressDelegate(onProgress: onProgress)
        let session = URLSession(configuration: .default, delegate: delegate, delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }

        let (_, response) = try await session.upload(for: request, fromFile: fileURL)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw ApiError(message: "Upload failed (\(status))", status: status)
        }
    }

    /// Upload a picked image (cover photos): returns its R2 key.
    static func uploadImage(data: Data, ext: String = "jpg") async throws -> String {
        let presign = try await presign(ext: ext)
        try await put(url: URL(string: presign.url)!, data: data, contentType: "image/jpeg")
        return presign.key
    }
}

/// Bridges NSURLSession delegate progress into an async-friendly callback.
private final class ProgressDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    let onProgress: @Sendable (Double) -> Void

    init(onProgress: @Sendable @escaping (Double) -> Void) {
        self.onProgress = onProgress
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64,
    ) {
        guard totalBytesExpectedToSend > 0 else { return }
        onProgress(Double(totalBytesSent) / Double(totalBytesExpectedToSend))
    }
}
