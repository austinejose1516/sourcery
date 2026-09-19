/**
 * One-off backfill: estimate per-serving nutrition + allergens for existing
 * recipes that predate the extractor change. Text-only (title + ingredients), so
 * it works even when the source video is gone. Idempotent — skips any recipe that
 * already has a nutrition row.
 *
 *   pnpm --filter api backfill:nutrition          # all missing
 *   pnpm --filter api backfill:nutrition -- --limit 20
 *
 * Requires OPENROUTER_API_KEY (uses the same model as the fallback extractor).
 */
import { z } from 'zod';
import { ALLERGENS, nutritionPerServingSchema } from '@recipeer/core';
import { env } from '../src/env';
import { prisma } from '../src/lib/prisma';
import { stripJsonFences } from '../src/lib/extractors/shared';

const responseSchema = z.object({
  nutrition_per_serving: nutritionPerServingSchema.nullish(),
  contains_allergens: z.array(z.enum(ALLERGENS)).optional().default([]),
});

const SYSTEM_PROMPT = `You are a nutrition estimator. Given a recipe's title, servings and ingredient list, estimate the PER-SERVING nutrition and list the major allergens present. Return only JSON, no prose or markdown.

Rules:
- Estimate for ONE serving (divide totals by the servings count). Figures are approximate — set any metric you cannot reasonably estimate to null.
- calories are kcal; protein/carbs/fat/fiber/sugar/sat_fat in grams; sodium in milligrams.
- contains_allergens uses ONLY these tokens: ${ALLERGENS.join(', ')}. Return [] when none apply (butter/ghee/yoghurt → MILK; wheat flour → WHEAT_GLUTEN; prawns → SHELLFISH).

Return JSON of exactly this shape:
{
  "nutrition_per_serving": { "calories": number|null, "protein_g": number|null, "carbs_g": number|null, "fat_g": number|null, "fiber_g": number|null, "sugar_g": number|null, "sat_fat_g": number|null, "sodium_mg": number|null } | null,
  "contains_allergens": string[]
}`;

async function estimate(input: string): Promise<z.infer<typeof responseSchema>> {
  const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'ReciPeer',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text().catch(() => '')).slice(0, 400)}`);
  const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned no content');
  return responseSchema.parse(JSON.parse(stripJsonFences(content)));
}

async function main() {
  if (!env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is required for the backfill');
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : undefined;

  const recipes = await prisma.recipe.findMany({
    where: { nutrition: null },
    select: {
      id: true,
      title: true,
      baseServings: true,
      ingredients: { orderBy: { orderIndex: 'asc' }, select: { name: true, amount: true, unit: true, quantityNote: true } },
    },
    take: limit,
  });

  console.log(`Found ${recipes.length} recipe(s) without nutrition.`);
  let ok = 0;
  for (const r of recipes) {
    const ingredients = r.ingredients
      .map((i) => `- ${[i.amount, i.unit, i.name].filter(Boolean).join(' ')}${i.quantityNote ? ` (${i.quantityNote})` : ''}`)
      .join('\n');
    const input = `Title: ${r.title}\nServings: ${r.baseServings}\nIngredients:\n${ingredients}`;
    try {
      const { nutrition_per_serving: n, contains_allergens } = await estimate(input);
      await prisma.$transaction([
        prisma.recipe.update({ where: { id: r.id }, data: { containsAllergens: contains_allergens } }),
        ...(n
          ? [
              prisma.recipeNutrition.create({
                data: {
                  recipeId: r.id,
                  calories: n.calories != null ? Math.round(n.calories) : null,
                  proteinG: n.protein_g,
                  carbsG: n.carbs_g,
                  fatG: n.fat_g,
                  fiberG: n.fiber_g,
                  sugarG: n.sugar_g,
                  satFatG: n.sat_fat_g,
                  sodiumMg: n.sodium_mg,
                  source: 'AI_ESTIMATED',
                },
              }),
            ]
          : []),
      ]);
      ok += 1;
      console.log(`  ✓ ${r.title} (${contains_allergens.join(', ') || 'no allergens'})`);
    } catch (err) {
      console.warn(`  ✗ ${r.title}: ${(err as Error).message}`);
    }
  }
  console.log(`Done. ${ok}/${recipes.length} updated.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
