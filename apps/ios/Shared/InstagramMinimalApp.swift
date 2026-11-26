import SwiftUI

@main
struct InstagramMinimalApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        #if os(macOS)
        .windowResizability(.contentSize)
        #endif
    }
}
