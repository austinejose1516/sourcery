/**
 * Run with:  node --import tsx --test src/nutrition/compute.test.ts
 * (from packages/core). Uses only node:test + node:assert — no test framework dep.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ageFromDob,
  allergenConflicts,
  applyGoal,
  bmiCategory,
  computeBmi,
  computeBmr,
  computeDailyCalorieTarget,
  computeProfileMetrics,
  computeTdee,
  macroTargetsFromCalories,
  percentOfDaily,
} from './compute';
import type { BodyModel } from './types';

test('Mifflin-St Jeor BMR — female reference case', () => {
  // F, 60kg, 165cm, 30y → 10*60 + 6.25*165 - 5*30 - 161 = 1320.25
  assert.equal(computeBmr('FEMALE', 60, 165, 30), 1320.25);
});

test('Mifflin-St Jeor BMR — male reference case', () => {
  // M, 80kg, 180cm, 30y → 10*80 + 6.25*180 - 5*30 + 5 = 1780
  assert.equal(computeBmr('MALE', 80, 180, 30), 1780);
});

test('TDEE applies the activity multiplier', () => {
  assert.equal(computeTdee(1320.25, 'SEDENTARY'), 1320.25 * 1.2);
  assert.equal(computeTdee(2000, 'MODERATE'), 3100);
});

test('goal shifts maintenance by ±15%', () => {
  assert.equal(applyGoal(2000, 'MAINTAIN'), 2000);
  assert.equal(applyGoal(2000, 'LOSE'), 1700);
  assert.equal(applyGoal(2000, 'GAIN'), 2300);
});

test('daily calorie target end-to-end, rounded to nearest 10', () => {
  const body: BodyModel = {
    sex: 'FEMALE',
    weightKg: 60,
    heightCm: 165,
    ageYears: 30,
    activityLevel: 'SEDENTARY',
    dietGoal: 'MAINTAIN',
  };
  // 1320.25 × 1.2 = 1584.3 → round/10*10 = 1580
  assert.equal(computeDailyCalorieTarget(body), 1580);
});

test('daily calorie target is null when a required input is missing', () => {
  const base: BodyModel = {
    sex: 'FEMALE',
    weightKg: 60,
    heightCm: 165,
    ageYears: 30,
    activityLevel: 'SEDENTARY',
    dietGoal: 'MAINTAIN',
  };
  assert.equal(computeDailyCalorieTarget({ ...base, sex: null }), null);
  assert.equal(computeDailyCalorieTarget({ ...base, activityLevel: null }), null);
  assert.equal(computeDailyCalorieTarget({ ...base, ageYears: null }), null);
});

test('goal defaults to maintenance when unset', () => {
  const body: BodyModel = {
    sex: 'FEMALE',
    weightKg: 60,
    heightCm: 165,
    ageYears: 30,
    activityLevel: 'SEDENTARY',
    dietGoal: null,
  };
  assert.equal(computeDailyCalorieTarget(body), 1580);
});

test('BMI value + category boundaries', () => {
  assert.deepEqual(computeBmi(60, 165), { value: 22, category: 'normal' });
  assert.equal(bmiCategory(18.4), 'underweight');
  assert.equal(bmiCategory(18.5), 'normal');
  assert.equal(bmiCategory(24.9), 'normal');
  assert.equal(bmiCategory(25), 'overweight');
  assert.equal(bmiCategory(29.9), 'overweight');
  assert.equal(bmiCategory(30), 'obese');
});

test('BMI null on missing/invalid inputs', () => {
  assert.equal(computeBmi(null, 165), null);
  assert.equal(computeBmi(60, null), null);
  assert.equal(computeBmi(0, 165), null);
});

test('macro targets split a calorie budget (30/40/30)', () => {
  // 2000 kcal → P 30%/4 =150g, C 40%/4 =200g, F 30%/9 ≈67g
  assert.deepEqual(macroTargetsFromCalories(2000), { proteinG: 150, carbsG: 200, fatG: 67 });
});

test('computeProfileMetrics ties it together', () => {
  const m = computeProfileMetrics({
    sex: 'FEMALE',
    weightKg: 60,
    heightCm: 165,
    ageYears: 30,
    activityLevel: 'SEDENTARY',
    dietGoal: 'MAINTAIN',
  });
  assert.deepEqual(m.bmi, { value: 22, category: 'normal' });
  assert.equal(m.dailyCalorieTarget, 1580);
  assert.ok(m.macroTargets && m.macroTargets.proteinG > 0);
});

test('percentOfDaily rounds, guards zero/null', () => {
  assert.equal(percentOfDaily(500, 2000), 25);
  assert.equal(percentOfDaily(null, 2000), null);
  assert.equal(percentOfDaily(500, 0), null);
  assert.equal(percentOfDaily(500, null), null);
});

test('allergenConflicts intersects viewer allergies with recipe allergens', () => {
  assert.deepEqual(allergenConflicts(['TREE_NUTS', 'PEANUTS'], ['TREE_NUTS', 'MILK']), ['TREE_NUTS']);
  assert.deepEqual(allergenConflicts(['MILK'], ['TREE_NUTS']), []);
  assert.deepEqual(allergenConflicts([], ['TREE_NUTS']), []);
});

test('ageFromDob counts whole years around the birthday', () => {
  const now = new Date('2026-07-09');
  assert.equal(ageFromDob('1996-07-09', now), 30);
  assert.equal(ageFromDob('1996-07-10', now), 29); // birthday not yet reached
  assert.equal(ageFromDob('1996-01-01', now), 30);
});
