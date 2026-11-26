import SwiftUI

/// Paleta do Instagram Minimal (a mesma da extensão).
enum Theme {
    static let white = Color(red: 1, green: 1, blue: 1)                              // #FFFFFF
    static let lightGray = Color(red: 0xF5 / 255, green: 0xF5 / 255, blue: 0xF7 / 255) // #F5F5F7
    static let midGray = Color(red: 0x86 / 255, green: 0x86 / 255, blue: 0x8B / 255)   // #86868B
    static let black = Color(red: 0x1C / 255, green: 0x1C / 255, blue: 0x1E / 255)     // #1C1C1E
    static let blue = Color(red: 0, green: 0x7A / 255, blue: 1)                         // #007AFF
}

/// Marca: traço de "menos" e ponto azul.
struct LogoMark: View {
    var size: CGFloat = 72
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let fg: Color = scheme == .dark ? Theme.lightGray : Theme.black
        let bg: Color = scheme == .dark ? Theme.black : Theme.white
        RoundedRectangle(cornerRadius: size * 0.23, style: .continuous)
            .fill(fg)
            .frame(width: size, height: size)
            .overlay {
                HStack(spacing: size * 0.06) {
                    Capsule().fill(bg).frame(width: size * 0.375, height: size * 0.094)
                    Circle().fill(Theme.blue).frame(width: size * 0.11, height: size * 0.11)
                }
                .offset(x: size * 0.02)
            }
            .accessibilityLabel("Instagram Minimal")
    }
}
