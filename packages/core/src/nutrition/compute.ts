/**
 * Pure nutrition maths — the load-bearing logic behind the recipe personalization.
 * No I/O, no dependencies: reused by the API (to hydrate GET /users/me) and by the
 * mobile app (to render the per-serving callout) so both agree to the digit.
 *
 * References:
 *   BMR  — Mifflin-St Jeor (1990), the modern clinical default.
 *   TDEE — BMR × activity multiplier (Harris-Benedict activity factors).
 */

import type {
  ActivityLevel,
  Allergen,
  BiologicalSex,
  BmiCategory,
  BmiResult,
  BodyModel,
  DietGoal,
  MacroTargetsDTO,
  ProfileMetrics,
} from './types';

/** Activity multipliers applied to BMR to get maintenance calories (TDEE). */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/** Fraction of maintenance calories to target per goal (±15% off TDEE). */
export const GOAL_ADJUSTMENT: Record<DietGoal, number> = {
  LOSE: 0.85,
  MAINTAIN: 1,
  GAIN: 1.15,
};

/**
 * Balanced daily macro split as fractions of total calories: 30% protein,
 * 40% carbohydrate, 30% fat. A sensible default, not medical advice.
 */
const MACRO_SPLIT = { protein: 0.3, carbs: 0.4, fat: 0.3 } as const;
/** Atwater energy factors — kcal per gram. */
const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Whole years between a date of birth and now. */
export function ageFromDob(dob: Date | string, now: Date = new Date()): number {
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * Basal metabolic rate via Mifflin-St Jeor (kcal/day):
 *   10·kg + 6.25·cm − 5·age + s   (s = +5 male, −161 female)
 */
export function computeBmr(
  sex: BiologicalSex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return base + (sex === 'MALE' ? 5 : -161);
}

/** Maintenance calories: BMR scaled by activity level. */
export function computeTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/** Shift maintenance calories toward the user's goal. */
export function applyGoal(tdee: number, goal: DietGoal): number {
  return tdee * GOAL_ADJUSTMENT[goal];
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return 'underweight';
  if (value < 25) return 'normal';
  if (value < 30) return 'overweight';
  return 'obese';
}

/** Body Mass Index = kg / m². Null when height/weight are missing or non-positive. */
export function computeBmi(weightKg: number | null, heightCm: number | null): BmiResult | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  const value = Math.round((weightKg / (m * m)) * 10) / 10;
  return { value, category: bmiCategory(value) };
}

/**
 * Daily calorie target (kcal), rounded to the nearest 10, or null if any input
 * required by Mifflin-St Jeor / activity / goal is missing.
 */
export function computeDailyCalorieTarget(body: BodyModel): number | null {
  const { sex, weightKg, heightCm, ageYears, activityLevel, dietGoal } = body;
  if (!sex || !weightKg || !heightCm || ageYears == null || !activityLevel) return null;
  const bmr = computeBmr(sex, weightKg, heightCm, ageYears);
  const tdee = computeTdee(bmr, activityLevel);
  const target = applyGoal(tdee, dietGoal ?? 'MAINTAIN');
  return Math.round(target / 10) * 10;
}

/** Split a daily calorie target into gram targets per macronutrient. */
export function macroTargetsFromCalories(calories: number): MacroTargetsDTO {
  return {
    proteinG: Math.round((calories * MACRO_SPLIT.protein) / KCAL_PER_G.protein),
    carbsG: Math.round((calories * MACRO_SPLIT.carbs) / KCAL_PER_G.carbs),
    fatG: Math.round((calories * MACRO_SPLIT.fat) / KCAL_PER_G.fat),
  };
}

/** BMI + daily calorie target + macro targets, each null when its inputs are incomplete. */
export function computeProfileMetrics(body: BodyModel): ProfileMetrics {
  const dailyCalorieTarget = computeDailyCalorieTarget(body);
  return {
    bmi: computeBmi(body.weightKg, body.heightCm),
    dailyCalorieTarget,
    macroTargets: dailyCalorieTarget == null ? null : macroTargetsFromCalories(dailyCalorieTarget),
  };
}

/**
 * What percentage of a daily target one serving covers, rounded to a whole number.
 * Null when the target is missing/zero or the serving value is unknown.
 */
export function percentOfDaily(
  servingValue: number | null,
  dailyTarget: number | null,
): number | null {
  if (servingValue == null || !dailyTarget || dailyTarget <= 0) return null;
  return Math.round((servingValue / dailyTarget) * 100);
}

/**
 * The allergens a recipe contains that the viewer is allergic to — the safety
 * check behind the recipe warning. Simple set intersection, order preserved from
 * the recipe's list.
 */
export function allergenConflicts(
  userAllergens: Allergen[],
  recipeAllergens: Allergen[],
): Allergen[] {
  const mine = new Set(userAllergens);
  return recipeAllergens.filter((a) => mine.has(a));
}
