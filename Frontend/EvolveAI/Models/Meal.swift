import Foundation

// A simple struct to represent a meal
struct Meal: Identifiable {
    let id = UUID()
    let name: String
    let calories: Int
}

let mockMeals = [
    Meal(name: "Breakfast: Oatmeal", calories: 350),
    Meal(name: "Lunch: Grilled Chicken Salad", calories: 500)
]
