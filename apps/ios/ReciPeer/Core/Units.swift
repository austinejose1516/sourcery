import Foundation

/// Canonical abbreviations for common cooking measurement units.
/// Mirrors packages/core/src/recipe/units.ts.
private let unitAbbreviations: [String: String] = [
    "teaspoon": "tsp", "teaspoons": "tsp", "tsps": "tsp",
    "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsps": "tbsp",
    "gram": "g", "grams": "g", "gramme": "g", "grammes": "g",
    "milligram": "mg", "milligrams": "mg",
    "kilogram": "kg", "kilograms": "kg", "kilogramme": "kg", "kilogrammes": "kg",
    "kilo": "kg", "kilos": "kg",
    "milliliter": "ml", "milliliters": "ml", "millilitre": "ml", "millilitres": "ml",
    "liter": "l", "liters": "l", "litre": "l", "litres": "l",
    "ounce": "oz", "ounces": "oz",
    "pound": "lb", "pounds": "lb", "lbs": "lb",
    "pint": "pt", "pints": "pt",
    "quart": "qt", "quarts": "qt",
    "gallon": "gal", "gallons": "gal",
]

/// Replace any spelled-out unit word with its abbreviation, case-insensitive.
func abbreviateUnits(_ text: String) -> String {
    var result = ""
    var word = ""
    for character in text {
        if character.isLetter {
            word.append(character)
        } else {
            if !word.isEmpty {
                result += unitAbbreviations[word.lowercased()] ?? word
                word = ""
            }
            result.append(character)
        }
    }
    if !word.isEmpty {
        result += unitAbbreviations[word.lowercased()] ?? word
    }
    return result
}

/// Compose an ingredient's display quantity from its structured parts.
func formatQuantity(amount: Double?, unit: String?, quantityNote: String?) -> String? {
    if let amount {
        let unitPart = unit.map { " \(abbreviateUnits($0))" } ?? ""
        return "\(amount)\(unitPart)"
    }
    return quantityNote
}
