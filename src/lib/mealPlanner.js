import { MEALS } from '../data/foods.js'

// ---------- Preference scoring ----------

function scoreMeal(meal, likedTags, dislikedTags) {
  let score = 0
  for (const t of meal.tags) {
    if (likedTags.includes(t)) score += 2
    if (dislikedTags.includes(t)) score -= 5
  }
  return score
}

function pickMeal(type, likedTags, dislikedTags, recentIds, excludeIds = []) {
  const candidates = MEALS.filter(
    m => m.type === type && !dislikedTags.some(t => m.tags.includes(t)) && !excludeIds.includes(m.id)
  )
  const pool = candidates.length ? candidates : MEALS.filter(m => m.type === type && !excludeIds.includes(m.id))
  if (pool.length === 0) return null

  const ranked = [...pool].sort((a, b) => {
    const scoreDiff = scoreMeal(b, likedTags, dislikedTags) - scoreMeal(a, likedTags, dislikedTags)
    if (scoreDiff !== 0) return scoreDiff
    const aRecent = recentIds.includes(a.id) ? 1 : 0
    const bRecent = recentIds.includes(b.id) ? 1 : 0
    return aRecent - bRecent
  })

  return ranked[0]
}

function sumMacros(meals) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}

// Scales a meal's macros AND ingredients by the same factor, so "1.3x portion to
// hit your calories" is something you can actually cook, not just a bigger number.
// portionMultiplier is kept on the result so the UI can show it plainly, and the
// original per-serving values are preserved as base* fields so a meal can later
// be swapped out and the day rescaled again without any rounding drift.
function scaleMealForTarget(meal, multiplier) {
  const m = Math.round(multiplier * 100) / 100
  return {
    ...meal,
    portionMultiplier: m,
    baseCalories: meal.calories,
    baseProtein: meal.protein,
    baseCarbs: meal.carbs,
    baseFat: meal.fat,
    baseIngredients: meal.ingredients,
    calories: Math.round(meal.calories * m),
    protein: Math.round(meal.protein * m),
    carbs: Math.round(meal.carbs * m),
    fat: Math.round(meal.fat * m),
    ingredients: scaleMealIngredients(meal, m),
  }
}

// Reconstructs the unscaled, per-serving version of a meal that's already been
// through scaleMealForTarget — used when rebuilding a day after swapping a slot.
function toBaseMeal(m) {
  return {
    id: m.id,
    name: m.name,
    type: m.type,
    tags: m.tags,
    calories: m.baseCalories ?? m.calories,
    protein: m.baseProtein ?? m.protein,
    carbs: m.baseCarbs ?? m.carbs,
    fat: m.baseFat ?? m.fat,
    servingWeightG: m.servingWeightG,
    ingredients: m.baseIngredients ?? m.ingredients,
    recipe: m.recipe,
  }
}

// ---------- Multi-day plan generation ----------

// Clamp how far a single portion gets scaled — beyond this it stops looking
// like a real serving and the plan should lean on an extra snack instead.
const MIN_MULTIPLIER = 0.75
const MAX_MULTIPLIER = 1.6

// Takes a set of unscaled (base) meals for one day and scales them to hit the
// calorie target, adding an extra snack if clamped scaling still falls short.
// Shared by both full-week generation and single-slot regeneration/swap so a
// day always gets rebuilt the same way no matter how its meals were chosen.
function buildDayFromBaseMeals(dayNumber, baseMeals, { targets, likedTags = [], dislikedTags = [] }) {
  const baseTotal = sumMacros(baseMeals)
  const rawMultiplier = baseTotal.calories > 0 ? targets.calories / baseTotal.calories : 1
  const multiplier = Math.min(Math.max(rawMultiplier, MIN_MULTIPLIER), MAX_MULTIPLIER)

  let scaledMeals = baseMeals.map(m => scaleMealForTarget(m, multiplier))
  let totals = sumMacros(scaledMeals)

  if (totals.calories < targets.calories * 0.92) {
    const usedIds = scaledMeals.map(m => m.id)
    const extraSnack = pickMeal('snack', likedTags, dislikedTags, [], usedIds)
    if (extraSnack) {
      const remaining = targets.calories - totals.calories
      const snackMultiplier = Math.min(Math.max(remaining / extraSnack.calories, 0.5), 2.5)
      scaledMeals = [...scaledMeals, scaleMealForTarget(extraSnack, snackMultiplier)]
      totals = sumMacros(scaledMeals)
    }
  }

  return { day: dayNumber, meals: scaledMeals, totals }
}

export function generatePlan({ targets, likedTags = [], dislikedTags = [], days = 7, includeSnack = true }) {
  const plan = []
  const recentIds = []

  for (let d = 0; d < days; d++) {
    const breakfast = pickMeal('breakfast', likedTags, dislikedTags, recentIds)
    const lunch = pickMeal('lunch', likedTags, dislikedTags, recentIds)
    const dinner = pickMeal('dinner', likedTags, dislikedTags, recentIds)
    const snack = includeSnack ? pickMeal('snack', likedTags, dislikedTags, recentIds) : null

    const baseMeals = [breakfast, lunch, dinner, ...(snack ? [snack] : [])].filter(Boolean)
    recentIds.push(...baseMeals.map(m => m.id))
    if (recentIds.length > 12) recentIds.splice(0, baseMeals.length)

    plan.push(buildDayFromBaseMeals(d + 1, baseMeals, { targets, likedTags, dislikedTags }))
  }

  return plan
}

// Replaces one meal slot within a day with a specific replacement (e.g. a meal
// picked from a pantry match) and rescales the whole day to keep hitting the
// calorie target. `replacement` should be an unscaled meal — either a raw
// entry from MEALS, or a matchPantryToMeals() result's `.meal`.
export function swapDayMeal({ day, mealIndex, replacement, targets, likedTags = [], dislikedTags = [] }) {
  const newBaseMeals = day.meals.map((m, i) => (i === mealIndex ? replacement : toBaseMeal(m)))
  return buildDayFromBaseMeals(day.day, newBaseMeals, { targets, likedTags, dislikedTags })
}

// Swaps one slot for a different auto-picked meal of the same type (excluding
// whatever's already used that day) and rescales. Returns the day unchanged
// if no alternative exists (e.g. every snack is on the dislike list).
export function regenerateDayMeal({ day, mealIndex, targets, likedTags = [], dislikedTags = [] }) {
  const current = day.meals[mealIndex]
  const excludeIds = day.meals.map(m => m.id)
  const replacement = pickMeal(current.type, likedTags, dislikedTags, [], excludeIds)
  if (!replacement) return day
  return swapDayMeal({ day, mealIndex, replacement, targets, likedTags, dislikedTags })
}

// ---------- Shopping list ----------

function ingredientKey(ing) {
  return `${ing.name}|${ing.unit}`
}

function formatQty(qty) {
  // Show clean fractions for common cooking amounts instead of long decimals
  const rounded = Math.round(qty * 100) / 100
  const wholePart = Math.floor(rounded)
  const frac = rounded - wholePart
  const fracMap = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' }
  const nearestFrac = Object.keys(fracMap).find(f => Math.abs(frac - Number(f)) < 0.05)
  if (nearestFrac) {
    return `${wholePart > 0 ? wholePart + ' ' : ''}${fracMap[nearestFrac]}`
  }
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2)
}

export function formatIngredient(ing) {
  const qtyStr = formatQty(ing.qty)
  return ing.unit ? `${qtyStr} ${ing.unit} ${ing.name}` : `${qtyStr} ${ing.name}`
}

// Aggregates ingredients across a plan into a shopping list, summing quantities
// of the same item+unit rather than just counting duplicate entries.
export function generateShoppingList(plan) {
  const map = new Map()
  for (const day of plan) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = ingredientKey(ing)
        const existing = map.get(key)
        if (existing) {
          existing.qty += ing.qty
        } else {
          map.set(key, { name: ing.name, unit: ing.unit, qty: ing.qty })
        }
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(ing => ({ key: ingredientKey(ing), label: formatIngredient(ing), name: ing.name }))
}

// ---------- Serving scaling (for meal prep) ----------

// Scales one meal's ingredients up to N servings/portions. Macros stay listed
// per-single-serving since that's what matters for tracking — the scaled
// ingredient list and total weight are what you use to batch-cook and portion.
export function scaleMealIngredients(meal, servings) {
  return meal.ingredients.map(ing => ({
    ...ing,
    qty: Math.round(ing.qty * servings * 100) / 100,
  }))
}

export function totalBatchWeight(meal, servings) {
  return Math.round(meal.servingWeightG * servings)
}

// ---------- Pantry matching ----------

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function tokenizePantry(pantryText) {
  return pantryText
    .split(/[,\n]/)
    .map(normalize)
    .filter(Boolean)
}

// Given free-text pantry items, ranks meals by how many of their ingredients
// the person already has. Returns meals with at least one ingredient match.
export function matchPantryToMeals(pantryText, { type = 'any', excludeIds = [] } = {}) {
  const pantryTokens = tokenizePantry(pantryText)
  if (pantryTokens.length === 0) return []

  const pool = (type === 'any' ? MEALS : MEALS.filter(m => m.type === type)).filter(m => !excludeIds.includes(m.id))

  const results = pool.map(meal => {
    const matched = []
    const missing = []
    for (const ing of meal.ingredients) {
      const nameNorm = normalize(ing.name)
      const has = pantryTokens.some(t => nameNorm.includes(t) || t.includes(nameNorm))
      if (has) matched.push(ing)
      else missing.push(ing)
    }
    const matchPct = meal.ingredients.length ? matched.length / meal.ingredients.length : 0
    return { meal, matched, missing, matchPct }
  })

  return results
    .filter(r => r.matchPct > 0)
    .sort((a, b) => b.matchPct - a.matchPct || b.meal.protein - a.meal.protein)
}
