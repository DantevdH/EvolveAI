import SwiftUI

// static means that the variable belongs to the Color type itself, not to a specific instance of a color
// let means that it can not be changed

// This extension adds our custom colors to SwiftUI's Color struct.
extension Color {
    // We are creating static properties, so we can call them like Color.evolveBackground
    
    // A dark, modern background color for the "Sporty AI" theme.
    static let evolveBackground = Color(red: 0.05, green: 0.05, blue: 0.1)
    
    // A secondary dark color for card backgrounds to make them stand out.
    static let evolveCard = Color(red: 0.1, green: 0.1, blue: 0.15)
    
    // A vibrant, electric blue for accents, buttons, and highlights.
    static let evolveBlue = Color(red: 0.2, green: 0.5, blue: 1.0)
    
    // You can add more custom colors here as your app grows.
    static let evolveGreen = Color(red: 0.1, green: 0.9, blue: 0.4)
}


      
