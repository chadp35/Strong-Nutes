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

function pickMeal(type, likedTags, dislikedTags, recentIds) {
  const candidates = MEALS.filter(m => m.type === type && !dislikedTags.some(t => m.tags.includes(t)))
  const pool = candidates.length ? candidates : MEALS.filter(m => m.type === type)

  const ranked = [...pool].sort((a, b) => {
    const scoreDiff = scoreMeal(b, likedTags, dislikedTags) - scoreMeal(a, likedTags, dislikedTags)
    if (scoreDiff !== 0) return scoreDiff
    const aRecent = recentIds.includes(a.id) ? 1 : 0
    const bRecent = recentIds.includes(b.id) ? 1 : 0
    return aRecent - bRecent
  })

  return ranked[0]
}

// ---------- Multi-day plan generation ----------

export function generatePlan({ targets, likedTags = [], dislikedTags = [], days = 7, includeSnack = true }) {
  const plan = []
  const recentIds = []

  for (let d = 0; d < days; d++) {
    const breakfast = pickMeal('breakfast', likedTags, dislikedTags, recentIds)
    const lunch = pickMeal('lunch', likedTags, dislikedTags, recentIds)
    const dinner = pickMeal('dinner', likedTags, dislikedTags, recentIds)
    const snack = includeSnack ? pickMeal('snack', likedTags, dislikedTags, recentIds) : null

    const meals = [breakfast, lunch, dinner, ...(snack ? [snack] : [])]
    recentIds.push(...meals.map(m => m.id))
    if (recentIds.length > 12) recentIds.splice(0, meals.length)

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    plan.push({ day: d + 1, meals, totals })
  }

  return plan
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
export function matchPantryToMeals(pantryText, { type = 'any' } = {}) {
  const pantryTokens = tokenizePantry(pantryText)
  if (pantryTokens.length === 0) return []

  const pool = type === 'any' ? MEALS : MEALS.filter(m => m.type === type)

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
