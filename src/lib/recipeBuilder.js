import { INGREDIENTS } from '../data/ingredients.js'

// Universal weight conversions — apply to any ingredient. Volume (cup/tbsp/
// tsp) and count (each/clove/slice) conversions are ingredient-specific
// (stored per-ingredient in ingredients.js) since a cup of rice and a cup of
// spinach weigh completely differently.
export const WEIGHT_UNITS_TO_GRAMS = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }

export function findIngredient(id) {
  return INGREDIENTS.find(i => i.id === id) || null
}

export function searchIngredients(query) {
  const q = query.trim().toLowerCase()
  if (q.length < 1) return []
  return INGREDIENTS.filter(i => i.name.toLowerCase().includes(q)).slice(0, 15)
}

// Best-effort name match against the local database — used to rebuild a
// recipe's ingredient lines from its saved {name, qty, unit} list when the
// richer builderState snapshot isn't available (see reconstructLines in
// RecipeBuilder.jsx).
export function findIngredientByName(name) {
  const q = (name || '').trim().toLowerCase()
  if (!q) return null
  return (
    INGREDIENTS.find(i => i.name.toLowerCase() === q) ||
    INGREDIENTS.find(i => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase())) ||
    null
  )
}

// Adapts an Open Food Facts search/barcode result into the same shape as a
// local ingredients.js entry, so it can flow through the exact same
// nutrition math — used when the local database doesn't have what someone's
// cooking with.
export function ingredientFromOFF(food) {
  return {
    id: `off-${food.id}`,
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    per100g: {
      calories: food.caloriesPer100g,
      protein: food.proteinPer100g,
      carbs: food.carbsPer100g,
      fat: food.fatPer100g,
    },
    unitGrams: { serving: food.servingGrams || 100 },
  }
}

// Every unit an ingredient can legally be entered in — weight units always,
// plus whatever ingredient-specific volume/count units are defined for it.
export function availableUnitsFor(ingredient) {
  const weightUnits = Object.keys(WEIGHT_UNITS_TO_GRAMS)
  const customUnits = ingredient?.unitGrams ? Object.keys(ingredient.unitGrams) : []
  return [...customUnits, ...weightUnits]
}

export function toGrams(ingredient, qty, unit) {
  if (!ingredient || !qty) return 0
  if (WEIGHT_UNITS_TO_GRAMS[unit]) return qty * WEIGHT_UNITS_TO_GRAMS[unit]
  if (ingredient.unitGrams && ingredient.unitGrams[unit] != null) return qty * ingredient.unitGrams[unit]
  return 0
}

// Nutrition for a specific quantity of a specific ingredient (raw, pre-cook).
// `ingredient` just needs { per100g, unitGrams? } — works equally for a
// local database entry or an ad-hoc one built from a web search result.
// Deliberately NOT rounded here — this feeds into totals that get summed
// across every ingredient line. Rounding each line first and then summing
// the rounded values can drift a few kcal/g off the true total (and drift by
// a DIFFERENT amount depending on how many lines there are or what order
// they were added in), which is exactly the kind of "the math changed
// overnight" symptom that's confusing to debug. Round only once, at the
// final total/per-serving display point.
export function nutritionForLine(ingredient, qty, unit) {
  const grams = toGrams(ingredient, qty, unit)
  const factor = grams / 100
  return {
    grams,
    calories: ingredient.per100g.calories * factor,
    protein: ingredient.per100g.protein * factor,
    carbs: ingredient.per100g.carbs * factor,
    fat: ingredient.per100g.fat * factor,
  }
}

function sumNutrition(lines) {
  return lines.reduce(
    (acc, l) => ({
      grams: acc.grams + l.grams,
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fat: acc.fat + l.fat,
    }),
    { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

// The core honest fact this whole feature rests on: cooking heat doesn't
// destroy calories from protein, carbs, or fat — those macros are chemically
// stable at cooking temperatures. What actually changes total nutrition is
// material genuinely leaving the dish — fat drained after browning ground
// meat, liquid poured off. This applies that as an explicit, optional,
// clearly-labeled adjustment rather than a made-up blanket "% lost to
// cooking" that would misinform people about macros that don't degrade.
//
// drainedFatTbsp: how many tablespoons of fat/drippings were drained off.
// One tablespoon of rendered fat is ~13.5g / ~120 kcal, a standard
// approximation for pan-rendered fat (mostly fat, negligible protein/carb).
export function applyDrainedFat(totals, drainedFatTbsp) {
  if (!drainedFatTbsp || drainedFatTbsp <= 0) return totals
  const fatRemovedG = drainedFatTbsp * 13.5
  const caloriesRemoved = Math.round(fatRemovedG * 9)
  return {
    ...totals,
    fat: Math.max(Math.round((totals.fat - fatRemovedG) * 10) / 10, 0),
    calories: Math.max(totals.calories - caloriesRemoved, 0),
  }
}

// Computes totals for a full list of recipe lines. Each line carries its own
// resolved ingredient data ({ name, per100g, unitGrams? }), qty, and unit —
// self-contained so lines sourced from the local database and lines sourced
// from a web search both work identically here.
export function calculateRecipeTotals(lines) {
  const resolved = lines.map(l => ({ ...nutritionForLine(l.ingredient, l.qty, l.unit), name: l.ingredient.name }))
  return { lineNutrition: resolved, totals: sumNutrition(resolved) }
}

// A reasonable starting point for "how many servings" — sized so each
// portion lands near a typical meal (~500 kcal), clamped to a sane range.
// Always just a suggestion; the person can override it.
export function suggestServings(totalCalories) {
  return Math.min(Math.max(Math.round(totalCalories / 500), 1), 12)
}

// Splits totals evenly across N servings. Weight per serving uses the real
// weighed cooked total if provided (more accurate — accounts for actual
// water loss/gain), otherwise falls back to summing raw ingredient weight.
export function computePerServing(totals, servings, actualCookedWeightG) {
  const s = Math.max(servings, 1)
  const weight = actualCookedWeightG > 0 ? actualCookedWeightG : totals.grams
  return {
    calories: Math.round(totals.calories / s),
    protein: Math.round((totals.protein / s) * 10) / 10,
    carbs: Math.round((totals.carbs / s) * 10) / 10,
    fat: Math.round((totals.fat / s) * 10) / 10,
    weightG: Math.round(weight / s),
  }
}
