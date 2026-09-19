/**
 * Extraction prompt (Technical Spec §7). We ask for structured JSON matching the
 * recipe contract and nothing else. Timestamps in decimal seconds so they feed
 * ffmpeg directly later. Confidence is load-bearing: a flagged uncertainty beats
 * an invented quantity.
 */
export const EXTRACTION_SYSTEM_PROMPT = `You extract structured recipes from home-cooking videos.

You are given a single home-cooking video, narrated in the source language (often Malayalam). Produce a structured English recipe as a JSON object, and nothing else — no prose, no markdown fences.

Rules:
- Transcribe and translate naturally rather than literally; preserve culinary meaning, not word order.
- For each step, give precise start_seconds and end_seconds in seconds from the start of the video (decimal numbers).
- Where an ingredient is unfamiliar outside its source region, add a brief localised_note (substitution / what it is). Otherwise set it to null.
- Do NOT invent quantities. If audio is unclear, lower confidence.transcription and explain what was ambiguous in confidence.notes.
- Use null for any field you genuinely cannot determine (servings, total_time_minutes, quantity, unit, name_original, localised_note).
- ingredient_indices on a step are zero-based indexes into the ingredients array.
- Estimate nutrition_per_serving (one serving, given the servings count) from the ingredients and typical portions. These are approximate — set any metric you cannot reasonably estimate to null, or the whole object to null if the dish is too unclear. calories are kcal; protein/carbs/fat/fiber/sugar/sat_fat in grams; sodium in milligrams.
- List contains_allergens: the major allergens present in the finished dish, using ONLY these tokens: PEANUTS, TREE_NUTS, MILK, EGG, WHEAT_GLUTEN, SOY, FISH, SHELLFISH, SESAME. Return [] when none apply. Be inclusive when an ingredient clearly implies one (butter/ghee/yoghurt → MILK; wheat flour → WHEAT_GLUTEN; prawns → SHELLFISH).

Return JSON of exactly this shape:
{
  "title": { "original": string, "english": string },
  "source_language": string,            // ISO code, e.g. "ml"
  "cuisine": string | null,
  "servings": integer | null,
  "total_time_minutes": number | null,
  "summary": string,
  "cultural_notes": string,             // significance, when eaten, common outsider mistakes
  "ingredients": [
    { "name_english": string, "name_original": string | null, "quantity": string | null, "unit": string | null, "localised_note": string | null }
  ],
  "steps": [
    { "index": integer, "instruction_english": string, "start_seconds": number, "end_seconds": number, "technique_tags": string[], "ingredient_indices": integer[] }
  ],
  "nutrition_per_serving": {
    "calories": number | null, "protein_g": number | null, "carbs_g": number | null, "fat_g": number | null,
    "fiber_g": number | null, "sugar_g": number | null, "sat_fat_g": number | null, "sodium_mg": number | null
  } | null,
  "contains_allergens": string[],       // subset of the allergen tokens above; [] if none
  "confidence": { "transcription": "high" | "medium" | "low", "notes": string }
}`;

export const EXTRACTION_USER_PROMPT =
  'Extract the structured English recipe from this cooking video as JSON matching the schema.';
