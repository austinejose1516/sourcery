/**
 * Canonical abbreviations for common cooking measurement units.
 *
 * Display-side normalisation for now (so "4 tablespoons" reads as "4 tbsp"). This
 * is the seed list for the eventual measurements table + zod validation of the AI
 * extraction output — keep it here in core so the API can reuse it later.
 */
export const UNIT_ABBREVIATIONS: Record<string, string> = {
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsps: 'tsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsps: 'tbsp',
  gram: 'g',
  grams: 'g',
  gramme: 'g',
  grammes: 'g',
  milligram: 'mg',
  milligrams: 'mg',
  kilogram: 'kg',
  kilograms: 'kg',
  kilogramme: 'kg',
  kilogrammes: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  lbs: 'lb',
  pint: 'pt',
  pints: 'pt',
  quart: 'qt',
  quarts: 'qt',
  gallon: 'gal',
  gallons: 'gal',
};

/**
 * Replace any spelled-out unit word with its abbreviation, leaving everything else
 * (numbers, fractions, other words) untouched. Case-insensitive.
 *   "4 tablespoons" → "4 tbsp"   ·   "200 grams" → "200 g"
 */
export function abbreviateUnits(text: string): string {
  return text.replace(/[a-zA-Z]+/g, (word) => UNIT_ABBREVIATIONS[word.toLowerCase()] ?? word);
}
