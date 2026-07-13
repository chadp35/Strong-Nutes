import { MEALS } from '../data/foods.js'
import { SIDES } from '../data/sides.js'
import { filterExcludedItems } from '../data/allergens.js'

// ---------- Safety + preference filtering ----------

// Applied FIRST, before any scoring — allergies and dietary framework are
// hard excludes, never just a soft preference. dislikedIngredients is also
// treated as a hard exclude (distinct from dislikedTags, which is a
// category-level soft preference used only in scoring below).
function applySafetyFilters(pool, personSettings = {}) {
  const { allergies = [], dietaryFramework = 'none', dislikedIngredients = [] } = personSettings
  let filtered = filterExcludedItems(pool, { allergies, dietaryFramework })
  if (dislikedIngredients.length > 0) {
    filtered = filtered.filter(item => {
      const names = (item.ingredients || []).map(i => (i.name || '').toLowerCase())
      const itemName = (item.name || '').toLowerCase()
      return !dislikedIngredients.some(di => names.some(n => n.includes(di.toLowerCase())) || itemName.includes(di.toLowerCase()))
    })
  }
  return filtered
}

// Merges the built-in meal database with a user's saved custom recipes —
// once saved, a custom recipe is shaped identically to a built-in meal, so
// it can be picked, scored, and scaled exactly the same way.
function mealsPool(customMeals = []) {
  return [...MEALS, ...customMeals]
}

function scoreMeal(meal, personSettings) {
  const { likedTags = [], dislikedTags = [], likedIngredients = [], leftoverTolerance } = personSettings
  let score = 0
  for (const t of meal.tags || []) {
    if (likedTags.includes(t)) score += 2
    if (dislikedTags.includes(t)) score -= 5
  }
  const ingredientNames = (meal.ingredients || []).map(i => (i.name || '').toLowerCase())
  for (const li of likedIngredients) {
    if (ingredientNames.some(n => n.includes(li.toLowerCase()))) score += 1.5
  }
  // Someone who loves batch cooking gets meal-prep-friendly meals prioritized;
  // someone who hates leftovers gets them gently deprioritized rather than
  // hard-excluded (still available, just not pushed to the front).
  if ((meal.tags || []).includes('meal-prep')) {
    if (leftoverTolerance === 'love') score += 2
    if (leftoverTolerance === 'hate') score -= 2
  }
  return score
}

function pickMeal(type, personSettings, recentIds, excludeIds = []) {
  const { dislikedTags = [], customMeals = [], lunchTemperature } = personSettings
  const basePool = applySafetyFilters(mealsPool(customMeals), personSettings)

  let typedPool = basePool.filter(m => m.type === type && !excludeIds.includes(m.id))

  // Lunch-specific temperature preference: filter toward cold/no-cook options
  // if that's what someone wants for midday, when the pool allows it.
  if (type === 'lunch' && lunchTemperature === 'cold') {
    const coldOnly = typedPool.filter(m => (m.tags || []).includes('no-cook'))
    if (coldOnly.length > 0) typedPool = coldOnly
  }

  const candidates = typedPool.filter(m => !dislikedTags.some(t => (m.tags || []).includes(t)))
  const pool = candidates.length ? candidates : typedPool
  if (pool.length === 0) return null

  const ranked = [...pool].sort((a, b) => {
    const scoreDiff = scoreMeal(b, personSettings) - scoreMeal(a, personSettings)
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

// ---------- Sides (the calorie-gap filler, replaces portion scaling) ----------

function sidesPool(customMeals = []) {
  return [
    ...MEALS.filter(m => m.type === 'snack').map(m => ({ ...m, isSide: true })),
    ...SIDES.map(s => ({ ...s, isSide: true, type: 'side' })),
    ...customMeals.filter(m => m.type === 'snack').map(m => ({ ...m, isSide: true })),
  ]
}

function pickSidesToFillGap({ remainingCalories, remainingProtein, personSettings = {}, excludeIds = [], maxSides = 4 }) {
  const { likedTags = [], dislikedTags = [], customMeals = [] } = personSettings
  const safePool = applySafetyFilters(sidesPool(customMeals), personSettings)
  const pool = safePool.filter(s => !dislikedTags.some(t => (s.tags || []).includes(t)))
  const chosen = []
  const usedIds = new Set(excludeIds)
  let remainingCals = remainingCalories
  let remainingProt = remainingProtein

  const MIN_GAP_WORTH_FILLING = 60

  while (chosen.length < maxSides && remainingCals >= MIN_GAP_WORTH_FILLING) {
    const candidates = pool.filter(s => !usedIds.has(s.id) && s.calories <= remainingCals + 40)
    if (candidates.length === 0) break

    const ranked = [...candidates].sort((a, b) => {
      const aLiked = likedTags.some(t => (a.tags || []).includes(t)) ? 1 : 0
      const bLiked = likedTags.some(t => (b.tags || []).includes(t)) ? 1 : 0
      if (aLiked !== bLiked) return bLiked - aLiked

      if (remainingProt > 15) {
        return b.protein - a.protein
      }
      return Math.abs(a.calories - remainingCals) - Math.abs(b.calories - remainingCals)
    })

    const pick = ranked[0]
    chosen.push(pick)
    usedIds.add(pick.id)
    remainingCals -= pick.calories
    remainingProt -= pick.protein
  }

  return chosen
}

// Builds one day from fixed, unscaled core meals (breakfast/lunch/dinner).
// For a LARGE remaining gap (common at higher-calorie targets), adds another
// real, whole meal rather than several small snacks — nobody eats 5 "sides"
// to make up 1000 calories. Only the smaller leftover gap after that gets
// filled with actual grazing-sized sides.
const EXTRA_MEAL_THRESHOLD = 350
const MAX_EXTRA_MEALS = 2
const MIN_SIDE_GAP = 60

function buildDayFromBaseMeals(dayNumber, coreMeals, { targets, personSettings = {} }) {
  const tagged = coreMeals.map(m => ({ ...m, isCore: true }))
  let remaining = targets.calories - sumMacros(tagged).calories

  const extras = []
  const usedIds = tagged.map(m => m.id)
  while (remaining >= EXTRA_MEAL_THRESHOLD && extras.length < MAX_EXTRA_MEALS) {
    const candidate = pickMeal('lunch', personSettings, [], usedIds)
    if (!candidate || candidate.calories > remaining + 120) break
    extras.push({ ...candidate, isExtra: true, slotLabel: 'Additional meal' })
    usedIds.push(candidate.id)
    remaining -= candidate.calories
  }

  let sides = []
  if (remaining >= MIN_SIDE_GAP) {
    const currentTotal = sumMacros([...tagged, ...extras])
    sides = pickSidesToFillGap({
      remainingCalories: remaining,
      remainingProtein: targets.protein - currentTotal.protein,
      personSettings,
      excludeIds: usedIds,
    })
  }

  const meals = [...tagged, ...extras, ...sides]
  return { day: dayNumber, meals, totals: sumMacros(meals) }
}

// ---------- Multi-day plan generation ----------

export function generatePlan({ targets, personSettings = {}, days = 7 }) {
  const plan = []
  const recentIds = []

  for (let d = 0; d < days; d++) {
    const breakfast = pickMeal('breakfast', personSettings, recentIds)
    const lunch = pickMeal('lunch', personSettings, recentIds)
    const dinner = pickMeal('dinner', personSettings, recentIds)

    const coreMeals = [breakfast, lunch, dinner].filter(Boolean)
    recentIds.push(...coreMeals.map(m => m.id))
    if (recentIds.length > 9) recentIds.splice(0, coreMeals.length)

    plan.push(buildDayFromBaseMeals(d + 1, coreMeals, { targets, personSettings }))
  }

  return plan
}

// Replaces one CORE meal slot (breakfast/lunch/dinner — not an extra meal or
// side) with a specific replacement and rebuilds the day, recomputing which
// extras/sides are needed against the new base.
export function swapDayMeal({ day, mealIndex, replacement, targets, personSettings = {} }) {
  const coreMeals = day.meals.filter(m => m.isCore)
  const newCoreMeals = coreMeals.map((m, i) => (i === mealIndex ? replacement : m))
  return buildDayFromBaseMeals(day.day, newCoreMeals, { targets, personSettings })
}

export function regenerateDayMeal({ day, mealIndex, targets, personSettings = {} }) {
  const coreMeals = day.meals.filter(m => m.isCore)
  const current = coreMeals[mealIndex]
  if (!current) return day
  const excludeIds = coreMeals.map(m => m.id)
  const replacement = pickMeal(current.type, personSettings, [], excludeIds)
  if (!replacement) return day
  return swapDayMeal({ day, mealIndex, replacement, targets, personSettings })
}

// Removes a specific extra meal or side by its position in day.meals (no
// auto-refill — if the person wants something else there, addExtraItem below).
export function removeMealAt({ day, index }) {
  const meals = day.meals.filter((_, i) => i !== index)
  return { day: day.day, meals, totals: sumMacros(meals) }
}

// Adds a specific item — a full meal, a local side, or a web-search result —
// as an extra to a day. All three shapes are plain {name, calories, protein,
// carbs, fat, ingredients?} objects, so any of them slot in the same way.
export function addExtraItem({ day, item, kind = 'side' }) {
  const tagged = { ...item, isSide: kind === 'side', isExtra: kind === 'meal' }
  const meals = [...day.meals, tagged]
  return { day: day.day, meals, totals: sumMacros(meals) }
}

// Ranks the local sides pool for manual "+ Add a side" browsing — same
// scoring as the automatic filler, exposed for the UI to show suggestions
// even when the person is adding by choice rather than to hit a gap exactly.
export function suggestSides({ remainingCalories, remainingProtein, personSettings = {}, excludeIds = [] }) {
  return pickSidesToFillGap({
    remainingCalories: Math.max(remainingCalories, 300), // don't starve the suggestion list if already at target
    remainingProtein,
    personSettings,
    excludeIds,
    maxSides: 6,
  })
}

// ---------- Shopping list ----------

function ingredientKey(ing) {
  return `${ing.name}|${ing.unit}`
}

function formatQty(qty) {
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

export function generateShoppingList(plan) {
  const map = new Map()
  for (const day of plan) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients || []) {
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

// ---------- Serving scaling (explicit meal-prep batching — user-chosen whole
// multiples, e.g. "make 3x this recipe for the week," NOT automatic
// calorie-target fitting, which is what caused the fractional-egg problem) ----------

export function scaleMealIngredients(meal, servings) {
  return (meal.ingredients || []).map(ing => ({
    ...ing,
    qty: Math.round(ing.qty * servings * 100) / 100,
  }))
}

export function totalBatchWeight(meal, servings) {
  return Math.round((meal.servingWeightG || 0) * servings)
}

// Scales a saved recipe (or any meal-shaped item) to a specific gram amount
// rather than a whole number of servings — the flexible, RP-Strength-style
// "just tell me the grams" adjustment. Macros AND ingredients scale together
// so the shopping list and bulk-prep stay accurate at whatever amount is
// actually being added.
export function scaleItemToGrams(item, grams) {
  const baseWeight = item.servingWeightG || grams
  const factor = baseWeight > 0 ? grams / baseWeight : 1
  return {
    ...item,
    id: `${item.id}-${Date.now()}`,
    calories: Math.round(item.calories * factor),
    protein: Math.round(item.protein * factor * 10) / 10,
    carbs: Math.round(item.carbs * factor * 10) / 10,
    fat: Math.round(item.fat * factor * 10) / 10,
    servingWeightG: Math.round(grams),
    ingredients: (item.ingredients || []).map(ing => ({ ...ing, qty: Math.round(ing.qty * factor * 100) / 100 })),
  }
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

export function matchPantryToMeals(pantryText, { type = 'any', excludeIds = [], personSettings = {} } = {}) {
  const pantryTokens = tokenizePantry(pantryText)
  if (pantryTokens.length === 0) return []

  const { customMeals = [] } = personSettings
  const safePool = applySafetyFilters(mealsPool(customMeals), personSettings)
  const pool = (type === 'any' ? safePool : safePool.filter(m => m.type === type)).filter(m => !excludeIds.includes(m.id))

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
