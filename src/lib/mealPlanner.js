import { MEALS } from '../data/foods.js'
import { SIDES } from '../data/sides.js'
import { filterExcludedItems } from '../data/allergens.js'
import { INGREDIENTS } from '../data/ingredients.js'
import { WEIGHT_UNITS_TO_GRAMS } from './recipeBuilder.js'

// ---------- Plan dates ----------
// A plan's "Day 1" is whatever calendar date the person actually starts it
// on (not always "today" — someone might plan for next Monday). Every day
// in the plan carries its own real date and weekday label so the Today tab
// can find "today's" day by date instead of always showing array index 0,
// and so the Plan tab can show real weekday names instead of bare "Day N".

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDaysToKey(dateKey, n) {
  const dt = parseDateKey(dateKey)
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function weekdayForKey(dateKey) {
  return WEEKDAY_NAMES[parseDateKey(dateKey).getUTCDay()]
}

// e.g. "Sunday, Jul 12"
export function dateLabelForKey(dateKey) {
  const dt = parseDateKey(dateKey)
  return `${WEEKDAY_NAMES[dt.getUTCDay()]}, ${MONTH_NAMES[dt.getUTCMonth()]} ${dt.getUTCDate()}`
}

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

// Browse-and-pick version of pickMeal — returns the full safety-filtered,
// preference-ranked list instead of just the top choice, for UI that lets
// someone manually pick a specific replacement meal (the Plan tab's "Change
// this meal" panel) rather than the automatic planner picking for them.
export function browseMeals({ type = 'any', personSettings = {}, excludeIds = [] } = {}) {
  const { customMeals = [] } = personSettings
  const basePool = applySafetyFilters(mealsPool(customMeals), personSettings)
  const pool = (type === 'any' ? basePool : basePool.filter(m => m.type === type)).filter(m => !excludeIds.includes(m.id))
  return [...pool].sort((a, b) => scoreMeal(b, personSettings) - scoreMeal(a, personSettings))
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

function buildDayFromBaseMeals(dayNumber, coreMeals, { targets, personSettings = {}, date }) {
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
  const day = { day: dayNumber, meals, totals: sumMacros(meals) }
  if (date) {
    day.date = date
    day.weekday = weekdayForKey(date)
    day.dateLabel = dateLabelForKey(date)
  }
  return day
}

// ---------- Multi-day plan generation ----------

// startDate ('YYYY-MM-DD') is whatever date the person picks as Day 1 —
// defaults to today if not given. Every subsequent day is startDate + N days,
// so the plan always maps onto real calendar days/weekdays.
export function generatePlan({ targets, personSettings = {}, days = 7, startDate }) {
  const plan = []
  const recentIds = []
  const base = startDate || new Date().toISOString().slice(0, 10)

  for (let d = 0; d < days; d++) {
    const breakfast = pickMeal('breakfast', personSettings, recentIds)
    const lunch = pickMeal('lunch', personSettings, recentIds)
    const dinner = pickMeal('dinner', personSettings, recentIds)

    const coreMeals = [breakfast, lunch, dinner].filter(Boolean)
    recentIds.push(...coreMeals.map(m => m.id))
    if (recentIds.length > 9) recentIds.splice(0, coreMeals.length)

    plan.push(buildDayFromBaseMeals(d + 1, coreMeals, { targets, personSettings, date: addDaysToKey(base, d) }))
  }

  return plan
}

// Replaces one CORE meal slot (breakfast/lunch/dinner — not an extra meal or
// side) with a specific replacement and rebuilds the day, recomputing which
// extras/sides are needed against the new base. The day's own date/weekday
// carries through untouched.
export function swapDayMeal({ day, mealIndex, replacement, targets, personSettings = {} }) {
  const coreMeals = day.meals.filter(m => m.isCore)
  const newCoreMeals = coreMeals.map((m, i) => (i === mealIndex ? replacement : m))
  return buildDayFromBaseMeals(day.day, newCoreMeals, { targets, personSettings, date: day.date })
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

// Removes any meal — core, extra, or side — by its position in day.meals.
// No auto-refill; if the person wants something in its place, addExtraItem
// or replaceMealAt below handle that explicitly.
export function removeMealAt({ day, index }) {
  const meals = day.meals.filter((_, i) => i !== index)
  return { day: day.day, date: day.date, weekday: day.weekday, dateLabel: day.dateLabel, meals, totals: sumMacros(meals) }
}

// Adds a specific item — a full meal, a local side, or a web-search result —
// as an extra to a day. All three shapes are plain {name, calories, protein,
// carbs, fat, ingredients?} objects, so any of them slot in the same way.
export function addExtraItem({ day, item, kind = 'side' }) {
  const tagged = { ...item, isSide: kind === 'side', isExtra: kind === 'meal' }
  const meals = [...day.meals, tagged]
  return { day: day.day, date: day.date, weekday: day.weekday, dateLabel: day.dateLabel, meals, totals: sumMacros(meals) }
}

// Replaces ANY meal at a given position — core, extra, or side — with a new
// item in place, without touching anything else in the day. This is the
// general-purpose "change this meal" operation used by the Plan tab's full
// edit panel (as opposed to swapDayMeal, which only handles core slots and
// rebalances extras/sides against the new total).
export function replaceMealAt({ day, index, item, kind }) {
  const original = day.meals[index]
  if (!original) return day
  const wasCore = !!original.isCore
  const tagged = {
    ...item,
    isCore: wasCore,
    isSide: !wasCore && (kind ? kind === 'side' : !!original.isSide),
    isExtra: !wasCore && (kind ? kind === 'meal' : !!original.isExtra),
    slotLabel: !wasCore ? (item.slotLabel || original.slotLabel) : undefined,
  }
  const meals = day.meals.map((m, i) => (i === index ? tagged : m))
  return { day: day.day, date: day.date, weekday: day.weekday, dateLabel: day.dateLabel, meals, totals: sumMacros(meals) }
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

// A "cooked rice, 1 cup" recipe measurement isn't something you buy — you buy
// the raw/dry good. These are typical raw:cooked volume yield ratios for the
// starches that actually show up as "cooked X" in recipes, so a cooked-cup
// measurement converts back to a realistic amount of the raw good instead of
// (wrongly) treating a cooked cup like a dry cup of the same size.
const COOKED_YIELD_RATIOS = [
  { match: /rice/i, ratio: 3 },
  { match: /quinoa/i, ratio: 2.8 },
  { match: /couscous/i, ratio: 2.5 },
  { match: /pasta|noodle/i, ratio: 2.5 },
  { match: /oat/i, ratio: 2 },
  { match: /lentil/i, ratio: 2.5 },
  { match: /bean/i, ratio: 2.2 },
]
function cookedYieldRatio(name) {
  return COOKED_YIELD_RATIOS.find(c => c.match.test(name))?.ratio ?? 2.5
}

// Recipes reasonably say "cooked rice" or "bacon (cooked)" because that's
// what you're eating — but nobody buys "cooked rice" at the store. Shopping
// list names strip that qualifier down to the actual thing you'd shop for.
function cleanShoppingName(name) {
  return name
    .replace(/\s*\((cooked|raw|dry)\)\s*/gi, ' ')
    .replace(/^\s*(cooked|raw|dry)\s+/i, '')
    .trim()
}

// Matches a recipe ingredient name against the raw-ingredient database so its
// volume/count units (cup, tbsp, each…) can be converted to real weight.
// Tries an exact match first, then loosens to substring matching in either
// direction (e.g. "rice" matches "White rice (dry)").
function findIngredientMatch(cleanName) {
  const q = cleanName.toLowerCase()
  const strip = s => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const qWords = q.split(/\s+/)
  return (
    INGREDIENTS.find(i => i.name.toLowerCase() === q) ||
    INGREDIENTS.find(i => strip(i.name) === q) ||
    INGREDIENTS.find(i => { const dbName = strip(i.name); return dbName.includes(q) || q.includes(dbName) }) ||
    // Last resort: shared significant word (e.g. "Jasmine rice" ~ "White rice
    // (dry)" via "rice") — approximate, but far more useful than no match.
    INGREDIENTS.find(i => strip(i.name).split(/\s+/).some(w => w.length >= 4 && qWords.includes(w))) ||
    null
  )
}

// Recipe ingredient units aren't always written exactly as the database key
// (e.g. "slices" in a recipe vs. "slice" in unitGrams) — try the unit as
// given, then its singular/plural counterpart.
function resolveUnitGrams(match, unit) {
  if (!match?.unitGrams || !unit) return null
  if (match.unitGrams[unit] != null) return match.unitGrams[unit]
  const singular = unit.replace(/s$/, '')
  if (match.unitGrams[singular] != null) return match.unitGrams[singular]
  const plural = `${unit}s`
  if (match.unitGrams[plural] != null) return match.unitGrams[plural]
  return null
}

// Whole-item units — the count itself IS the shopping quantity, so it reads
// naturally as a pluralized item name: "3 onions", "2 bananas".
const WHOLE_ITEM_UNITS = ['each', 'medium', 'large', 'small']
// Partial-item units — a "count" of these means a piece of something you
// buy whole, so the unit stays visible: "6 slices Bacon", "4 cloves Garlic"
// rather than the odd-looking "6 Bacons" / "4 Garlics".
const PARTIAL_UNIT_LABELS = { clove: 'clove', slice: 'slice', stick: 'stick', scoop: 'scoop', square: 'square' }

function pluralize(name, count) {
  if (count <= 1 || /s$/i.test(name)) return name
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`
  return `${name}s`
}

function formatWeightGrams(grams) {
  if (grams >= 453.592) return `${Math.round((grams / 453.592) * 10) / 10} lb`
  const oz = Math.max(Math.round(grams / 28.3495), grams > 0 ? 1 : 0)
  return `${oz} oz`
}

// Builds the shopping list from a plan by converting every ingredient into
// real shopping-list terms: cooked/raw qualifiers stripped from names, and
// recipe-measuring units (tsp/tbsp/cup) converted to what you'd actually buy
// — weight (oz/lb) for bulk goods, or a rounded-up item count ("3 onions")
// for naturally countable produce/proteins — instead of showing "3.5 cups"
// or fragmenting the same ingredient across separate tsp/tbsp/cup lines.
// Anything that can't be resolved against the ingredient database (custom or
// web-sourced items without a match) falls back to the original recipe
// quantity, just with the name cleaned up.
export function generateShoppingList(plan) {
  const gramBuckets = new Map()
  const fallbackBuckets = new Map()

  for (const day of plan) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients || []) {
        const cleanName = cleanShoppingName(ing.name)
        const wasCooked = /cooked/i.test(ing.name)
        const unit = (ing.unit || '').toLowerCase().trim()
        const match = findIngredientMatch(cleanName)

        let grams = null
        if (unit && WEIGHT_UNITS_TO_GRAMS[unit]) {
          grams = ing.qty * WEIGHT_UNITS_TO_GRAMS[unit]
        } else if (match) {
          const unitG = resolveUnitGrams(match, unit)
          if (unitG != null) {
            grams = ing.qty * unitG
            if (wasCooked && ['cup', 'tbsp', 'tsp'].includes(unit)) grams /= cookedYieldRatio(ing.name)
          }
        }

        if (grams != null) {
          const key = match ? `g:${match.id}` : `g:${cleanName.toLowerCase()}`
          // Whether THIS specific recipe measured the ingredient by count
          // (each/slice/clove/blank) or by weight/volume (cup/tbsp/tsp/oz/…).
          // A bucket only displays as a count ("6 slices Bacon") if every
          // contributing line was count-style — one recipe measuring cheese
          // by the cup is enough to make the whole bucket a weight, even if
          // the ingredient database also happens to know a slice weight.
          const singularUnit = unit.replace(/s$/, '')
          const isCountLine = unit === ''
            || WHOLE_ITEM_UNITS.includes(unit) || WHOLE_ITEM_UNITS.includes(singularUnit)
            || Object.keys(PARTIAL_UNIT_LABELS).includes(unit) || Object.keys(PARTIAL_UNIT_LABELS).includes(singularUnit)
          const existing = gramBuckets.get(key)
          if (existing) {
            existing.grams += grams
            existing.allCount = existing.allCount && isCountLine
          } else {
            gramBuckets.set(key, { cleanName, match, grams, allCount: isCountLine })
          }
        } else {
          const key = `f:${cleanName.toLowerCase()}|${unit}`
          const existing = fallbackBuckets.get(key)
          if (existing) existing.qty += ing.qty
          else fallbackBuckets.set(key, { cleanName, unit: ing.unit, qty: ing.qty })
        }
      }
    }
  }

  const results = []

  for (const { cleanName, match, grams, allCount } of gramBuckets.values()) {
    if (grams <= 0) continue
    const key = match ? `g:${match.id}` : `g:${cleanName.toLowerCase()}`
    const wholeUnit = allCount && match?.unitGrams && WHOLE_ITEM_UNITS.find(u => match.unitGrams[u] != null)
    const partialUnit = allCount && match?.unitGrams && Object.keys(PARTIAL_UNIT_LABELS).find(u => match.unitGrams[u] != null)

    if (wholeUnit) {
      const count = Math.max(Math.ceil(grams / match.unitGrams[wholeUnit]), 1)
      results.push({ key, label: `${count} ${pluralize(cleanName, count)}`, name: cleanName })
    } else if (partialUnit) {
      const count = Math.max(Math.ceil(grams / match.unitGrams[partialUnit]), 1)
      const unitLabel = pluralize(PARTIAL_UNIT_LABELS[partialUnit], count)
      results.push({ key, label: `${count} ${unitLabel} ${cleanName}`, name: cleanName })
    } else {
      results.push({ key, label: `${formatWeightGrams(grams)} ${cleanName}`, name: cleanName })
    }
  }

  for (const { cleanName, unit, qty } of fallbackBuckets.values()) {
    results.push({
      key: `f:${cleanName.toLowerCase()}|${unit}`,
      label: formatIngredient({ qty, unit, name: cleanName }),
      name: cleanName,
    })
  }

  return results.sort((a, b) => a.name.localeCompare(b.name))
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
