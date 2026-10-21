// 谁让这个刷子修仙的 —— macOS 原生外壳
// 用 WKWebView 加载内置的网页版；因为 ES 模块不能走 file://，
// 这里内嵌一个极小的本地静态服务器（仅监听 127.0.0.1）。
import Cocoa
import WebKit
import Network

// MARK: - 极简静态服务器

final class StaticServer {
    private let root: URL
    private var listener: NWListener?
    private(set) var port: UInt16 = 0

    init(root: URL) { self.root = root }

    func start() throws -> UInt16 {
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true
        let l = try NWListener(using: params, on: .any)
        listener = l

        let sem = DispatchSemaphore(value: 0)
        var failed = false
        l.stateUpdateHandler = { state in
            switch state {
            case .ready:
                if let p = l.port?.rawValue { self.port = p }
                sem.signal()
            case .failed:
                failed = true
                sem.signal()
            default:
                break
            }
        }
        l.newConnectionHandler = { [weak self] conn in
            self?.handle(conn)
        }
        l.start(queue: .global(qos: .userInitiated))
        _ = sem.wait(timeout: .now() + 8)
        if failed || port == 0 {
            throw NSError(domain: "StaticServer", code: 1, userInfo: [NSLocalizedDescriptionKey: "无法启动本地服务"])
        }
        return port
    }

    private func handle(_ conn: NWConnection) {
        conn.start(queue: .global())
        conn.receive(minimumIncompleteLength: 1, maximumLength: 1 << 16) { [weak self] data, _, _, _ in
            guard let self = self, let data = data,
                  let req = String(data: data, encoding: .utf8) else {
                conn.cancel()
                return
            }
            let parts = req.split(separator: " ", maxSplits: 2).map(String.init)
            let rawPath = parts.count > 1 ? parts[1] : "/"
            let path = rawPath.split(separator: "?").first.map(String.init) ?? "/"
            self.respond(conn, path: path)
        }
    }

    private func respond(_ conn: NWConnection, path: String) {
        var rel = path
        if rel.hasPrefix("/") { rel.removeFirst() }
        if rel.isEmpty { rel = "index.html" }
        if rel.hasSuffix("/") { rel += "index.html" }

        // 防目录穿越
        let safe = rel.replacingOccurrences(of: "..", with: "_")
        let fileURL = root.appendingPathComponent(safe)
        var body: Data
        var type = "application/octet-stream"

        if let attrs = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
           attrs[.type] as? FileAttributeType == .typeRegular,
           let data = try? Data(contentsOf: fileURL) {
            body = data
            type = mime(fileURL.pathExtension)
        } else {
            body = Data("404".utf8)
            type = "text/plain; charset=utf-8"
        }

        var header = "HTTP/1.1 200 OK\r\n"
        header += "Content-Type: \(type)\r\n"
        header += "Content-Length: \(body.count)\r\n"
        header += "Cache-Control: no-cache\r\n"
        header += "Connection: close\r\n\r\n"
        var out = Data(header.utf8)
        out.append(body)
        conn.send(content: out, completion: .contentProcessed { _ in conn.cancel() })
    }

    private func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "webmanifest": return "application/manifest+json; charset=utf-8"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "svg": return "image/svg+xml"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        case "txt", "md": return "text/plain; charset=utf-8"
        default: return "application/octet-stream"
        }
    }
}

// MARK: - 应用

final class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var server: StaticServer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        let rect = NSRect(x: 0, y: 0, width: 1280, height: 720)
        window = NSWindow(contentRect: rect,
                          styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        window.title = "谁让这个刷子修仙的"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.isMovableByWindowBackground = true
        window.minSize = NSSize(width: 880, height: 560)
        window.setFrameAutosaveName("GameWindow")

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // 存档持久化
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webView = WKWebView(frame: .zero, configuration: config)
        webView.setValue(false, forKey: "drawsBackground")
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        guard var resURL = Bundle.main.resourceURL else { return }
        // 网页资源放在 Resources/game 下
        let gameURL = resURL.appendingPathComponent("game")
        if FileManager.default.fileExists(atPath: gameURL.appendingPathComponent("index.html").path) {
            resURL = gameURL
        }
        let srv = StaticServer(root: resURL)
        server = srv
        do {
            let p = try srv.start()
            let url = URL(string: "http://127.0.0.1:\(p)/index.html")!
            webView.load(URLRequest(url: url))
        } catch {
            let alert = NSAlert()
            alert.messageText = "启动失败"
            alert.informativeText = "无法启动本地服务：\(error.localizedDescription)"
            alert.runModal()
            NSApp.terminate(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationDidBecomeActive(_ notification: Notification) {
        NSApp.activate(ignoringOtherApps: true)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
