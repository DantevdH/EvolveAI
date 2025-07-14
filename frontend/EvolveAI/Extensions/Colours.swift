import SwiftUI

// static means that the variable belongs to the Color type itself, not to a specific instance of a color
// let means that it can not be changed


extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// This extension adds our custom colors to SwiftUI's Color struct.
extension Color {
    // We are creating static properties, so we can call them like Color.evolveBackground
    
    // A dark, modern background color for the "Sporty AI" theme.
    static let evolveBackground = Color(red: 0.05, green: 0.05, blue: 0.1)
    
    // A secondary dark color for card backgrounds to make them stand out.
    static let evolveCard = Color(red: 0.1, green: 0.1, blue: 0.15)
    
    // A vibrant, electric blue for accents, buttons, and highlights.
    static let evolveBlue = Color(red: 0.2, green: 0.5, blue: 1.0)
    
    static let evolvePrimary = Color(hex:"#932322")
    
    // You can add more custom colors here as your app grows.
    static let evolveGreen = Color(red: 0.1, green: 0.9, blue: 0.4)
}


      
