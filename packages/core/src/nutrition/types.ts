/**
 * Shared nutrition + body-model contracts, mirrored from the Prisma enums so the
 * app and API agree on the wire shape without either importing @prisma/client.
 * Keep these string unions in sync with apps/api/prisma/schema.prisma.
 */

export type BiologicalSex = 'MALE' | 'FEMALE';

export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE' | 'VERY_ACTIVE';

export type DietGoal = 'LOSE' | 'MAINTAIN' | 'GAIN';

/** FDA/EU "big-9" major allergens (canonical order). Nut-free = PEANUTS + TREE_NUTS. */
export const ALLERGENS = [
  'PEANUTS',
  'TREE_NUTS',
  'MILK',
  'EGG',
  'WHEAT_GLUTEN',
  'SOY',
  'FISH',
  'SHELLFISH',
  'SESAME',
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export type NutritionSource = 'AI_ESTIMATED' | 'MANUAL' | 'COMPUTED';

/** Per-serving nutrition facts. Every metric nullable — a partial estimate still shows. */
export interface RecipeNutritionDTO {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  satFatG: number | null;
  sodiumMg: number | null;
  source: NutritionSource;
}

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BmiResult {
  value: number; // rounded to 1 decimal
  category: BmiCategory;
}

/** Daily macro targets (grams) derived from a calorie target. */
export interface MacroTargetsDTO {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/** The raw body-model inputs needed to compute BMI + calorie/macro targets. */
export interface BodyModel {
  sex: BiologicalSex | null;
  heightCm: number | null;
  weightKg: number | null;
  ageYears: number | null;
  activityLevel: ActivityLevel | null;
  dietGoal: DietGoal | null;
}

/** Everything the personalization needs, computed from a BodyModel. Null when inputs are incomplete. */
export interface ProfileMetrics {
  bmi: BmiResult | null;
  dailyCalorieTarget: number | null;
  macroTargets: MacroTargetsDTO | null;
}

/** GET /users/me response — identity + body model + computed metrics + preferences. */
export interface UserProfileDTO {
  id: string;
  username: string;
  displayName: string;
  // Body model (any may be null when the user skipped that question).
  sex: BiologicalSex | null;
  dateOfBirth: string | null; // ISO date
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  dietGoal: DietGoal | null;
  allergens: Allergen[];
  dietaryPrefs: string[]; // DietaryTag slugs
  // Server-computed conveniences (also derivable client-side from the fields above).
  metrics: ProfileMetrics;
}

/** Human-readable labels for the UI. */
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  PEANUTS: 'Peanuts',
  TREE_NUTS: 'Tree nuts',
  MILK: 'Milk',
  EGG: 'Egg',
  WHEAT_GLUTEN: 'Wheat / gluten',
  SOY: 'Soy',
  FISH: 'Fish',
  SHELLFISH: 'Shellfish',
  SESAME: 'Sesame',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Sedentary',
  LIGHT: 'Lightly active',
  MODERATE: 'Moderately active',
  ACTIVE: 'Active',
  VERY_ACTIVE: 'Very active',
};

export const DIET_GOAL_LABELS: Record<DietGoal, string> = {
  LOSE: 'Lose weight',
  MAINTAIN: 'Maintain weight',
  GAIN: 'Gain weight',
};

export const ALL_ALLERGENS: Allergen[] = [...ALLERGENS];
