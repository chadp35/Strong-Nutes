import { MEALS } from '../data/foods.js'
import { SIDES } from '../data/sides.js'
import { filterExcludedItems } from '../data/allergens.js'
import { INGREDIENTS } from '../data/ingredients.js'
import { WEIGHT_UNITS_TO_GRAMS, findIngredient, nutritionForLine } from './recipeBuilder.js'

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

// How many top-scored candidates "regenerate" randomizes across. A fully
// deterministic pickMeal (always ranked[0]) meant hitting regenerate only
// ever surfaced ONE alternative — hit it again and it ping-ponged straight
// back to the original. Randomizing across a shortlist of good-enough
// options (still filtered/ranked by safety + preference first) gives real
// variety while keeping every option something the person would actually want.
const SHORTLIST_SIZE = 6

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

  const ranked = [...pool].sort((a, b) => scoreMeal(b, personSettings) - scoreMeal(a, personSettings))

  // Pick randomly from the top-scored shortlist rather than always the
  // single best match. Prefer shortlist entries that aren't recently used,
  // but fall back to the full shortlist if everything in it is "recent"
  // (small pools) so regenerate never just returns nothing new.
  const shortlist = ranked.slice(0, SHORTLIST_SIZE)
  const fresh = shortlist.filter(m => !recentIds.includes(m.id))
  const finalPool = fresh.length > 0 ? fresh : shortlist
  return finalPool[Math.floor(Math.random() * finalPool.length)]
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

// Some very common pantry/recipe words share zero literal characters with
// the database entry they should resolve to (a pasta shape like "penne"
// doesn't contain the word "pasta" at all), so no amount of substring or
// word-overlap matching below would ever find them. This is checked first,
// before any fuzzy matching, for exactly those known gaps.
const INGREDIENT_NAME_ALIASES = {
  penne: 'pasta', spaghetti: 'pasta', rigatoni: 'pasta', macaroni: 'pasta',
  fusilli: 'pasta', linguine: 'pasta', farfalle: 'pasta', ziti: 'pasta',
  fettuccine: 'pasta', 'angel hair': 'pasta', orzo: 'pasta',
  marinara: 'marinara-sauce', 'tomato sauce': 'marinara-sauce', 'pasta sauce': 'marinara-sauce',
  'diced tomatoes': 'crushed-tomatoes', 'canned tomatoes': 'crushed-tomatoes',
  yogurt: 'greek-yogurt',
}

// Matches a recipe ingredient name against the raw-ingredient database so its
// volume/count units (cup, tbsp, each…) can be converted to real weight.
// Tries a known alias first, then exact match, then loosens to substring
// matching in either direction (e.g. "rice" matches "White rice (dry)").
function findIngredientMatch(cleanName) {
  const q = cleanName.toLowerCase()
  const strip = s => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
  const qWords = q.split(/\s+/)

  const aliasKey = Object.keys(INGREDIENT_NAME_ALIASES).find(k => q === k || q.includes(k))
  if (aliasKey) {
    const aliased = INGREDIENTS.find(i => i.id === INGREDIENT_NAME_ALIASES[aliasKey])
    if (aliased) return aliased
  }

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

// Word-level fuzzy match between a pantry token and a meal's ingredient name
// — plain substring-either-direction missed real pantry input like "penne"
// against a recipe line of "Penne pasta (dry)" failing to also catch things
// phrased differently, and more importantly meant near-misses (plurals,
// extra descriptors) silently fell through as "missing". Checks substring
// either direction first, then a shared significant word (>=4 chars).
function pantryTokenMatchesIngredient(token, ingredientName) {
  const name = normalize(ingredientName)
  if (name.includes(token) || token.includes(name)) return true
  const nameWords = name.split(' ').filter(w => w.length >= 4)
  const tokenWords = token.split(' ').filter(w => w.length >= 4)
  return nameWords.some(w => tokenWords.includes(w))
}

// Ranked by how much of the meal your pantry actually covers (MATCHED count,
// descending) first, then by fewest remaining ingredients needed (MISSING
// count, ascending) — not raw match percentage. Percentage alone let a tiny
// 1-ingredient snack "win" over a real dinner that uses several pantry items
// but also needs a couple more; matched-count-first fixes that, and is what
// actually fixed suggestions like "Turkey Chili" (which shared almost
// nothing with a penne/chicken/tomato/cheese/garlic pantry) outranking meals
// that are genuinely close matches.
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
      const has = pantryTokens.some(t => pantryTokenMatchesIngredient(t, ing.name))
      if (has) matched.push(ing)
      else missing.push(ing)
    }
    const matchPct = meal.ingredients.length ? matched.length / meal.ingredients.length : 0
    return { meal, matched, missing, matchPct, missingCount: missing.length }
  })

  return results
    .filter(r => r.matched.length > 0)
    .sort((a, b) => b.matched.length - a.matched.length || a.missingCount - b.missingCount || b.meal.protein - a.meal.protein)
}

// ---------- Generate-a-recipe-from-pantry ----------
// Rather than only matching the fixed meal database (which will always miss
// pantry combos nobody hand-wrote a recipe for), this builds a real recipe
// object — with computed macros from the actual ingredient database — out of
// whatever pantry items resolve to known ingredients. Falls back to a
// "you're close, just grab a couple things" suggestion when there isn't
// enough on hand to compose a full meal.

const PANTRY_ROLE_BY_CATEGORY = {
  protein: 'protein',
  seafood: 'protein',
  'plant-protein': 'protein',
  carb: 'carb',
  vegetable: 'vegetable',
  dairy: 'dairy',
  condiment: 'sauce',
  fruit: 'fruit',
}

const PANTRY_ROLE_DEFAULT_QTY = {
  protein: { qty: 6, unit: 'oz' },
  carb: { qty: 1, unit: 'cup' },
  vegetable: { qty: 1, unit: 'cup' },
  dairy: { qty: 0.25, unit: 'cup' },
  sauce: { qty: 0.5, unit: 'cup' },
  fruit: { qty: 1, unit: 'each' },
}

// Per-ingredient overrides for roles where "1 cup" is obviously wrong —
// nobody measures a whole cup of garlic. Small aromatics/produce get a
// sane real-world quantity instead of the generic per-role default.
const PANTRY_QTY_OVERRIDES = {
  garlic: { qty: 3, unit: 'clove' },
  onion: { qty: 0.5, unit: 'each' },
  leek: { qty: 0.5, unit: 'each' },
  lemon: { qty: 0.5, unit: 'each' },
  lime: { qty: 0.5, unit: 'each' },
  egg: { qty: 3, unit: 'large' },
  'egg-white': { qty: 4, unit: 'each' },
}

function titleCaseToken(token) {
  return token.replace(/\b\w/g, c => c.toUpperCase())
}

// Resolves each pantry line to a real ingredient database entry (reusing the
// same fuzzy/alias matcher the shopping list uses), grouped by the coarse
// role it plays in a recipe (protein/carb/vegetable/dairy/sauce/fruit).
function resolvePantryRoles(pantryTokens) {
  const roles = {}
  for (const token of pantryTokens) {
    const match = findIngredientMatch(token) || findIngredient(token.replace(/\s+/g, '-'))
    if (!match) continue
    const role = PANTRY_ROLE_BY_CATEGORY[match.category]
    if (!role) continue
    if (!roles[role]) roles[role] = []
    if (!roles[role].some(m => m.id === match.id)) roles[role].push({ ...match, pantryToken: token })
  }
  return roles
}

function pantryLine(ingredient) {
  const qtyUnit = PANTRY_QTY_OVERRIDES[ingredient.id] || PANTRY_ROLE_DEFAULT_QTY[PANTRY_ROLE_BY_CATEGORY[ingredient.category]] || { qty: 1, unit: 'each' }
  const nutrition = nutritionForLine(ingredient, qtyUnit.qty, qtyUnit.unit)
  const displayName = ingredient.name.replace(/\s*\(.*?\)\s*/g, '').trim() || titleCaseToken(ingredient.pantryToken || ingredient.id)
  return { name: displayName, qty: qtyUnit.qty, unit: qtyUnit.unit, ...nutrition }
}

function sumPantryLines(lines) {
  return lines.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fat: acc.fat + l.fat,
      grams: acc.grams + (l.grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
  )
}

// Builds one real, computed-macro meal from whatever pantry roles are
// available, choosing among a handful of simple, realistic templates
// (bake / pasta bake / skillet / bowl / simple sear) based on which roles
// are present — always favoring the protein with the highest matched
// quantity when more than one is on hand.
export function suggestPantryCombo(pantryText) {
  const pantryTokens = tokenizePantry(pantryText)
  if (pantryTokens.length === 0) return null

  const roles = resolvePantryRoles(pantryTokens)
  const protein = roles.protein?.[0]
  const carb = roles.carb?.[0]
  const vegetable = roles.vegetable?.[0]
  const dairy = roles.dairy?.[0]
  const sauce = roles.sauce?.[0]

  const resolvedCount = [protein, carb, vegetable, dairy, sauce].filter(Boolean).length
  if (resolvedCount === 0) return null

  // Not enough on hand for a full meal — point out the couple of staples
  // that would unlock one, rather than forcing a weird recipe out of one
  // lonely ingredient.
  if (resolvedCount < 2 || !protein) {
    const have = [protein, carb, vegetable, dairy, sauce].filter(Boolean).map(i => i.name.replace(/\s*\(.*?\)\s*/g, '').trim())
    const suggestions = []
    if (!protein) suggestions.push('a protein (chicken, ground turkey, tofu, eggs…)')
    if (!carb && !vegetable) suggestions.push('a carb or vegetable side')
    return {
      name: 'Not quite enough yet',
      isPartial: true,
      have,
      needed: suggestions.slice(0, 2),
      recipe: have.length
        ? `You've got ${have.join(', ')} — grab ${suggestions.join(' and ')} and I can build a full recipe.`
        : `Add a couple pantry staples and I can build a full recipe from what you have.`,
    }
  }

  const proteinLine = pantryLine(protein)
  const carbLine = carb ? pantryLine(carb) : null
  const vegLine = vegetable ? pantryLine(vegetable) : null
  const dairyLine = dairy ? pantryLine(dairy) : null
  const sauceLine = sauce ? pantryLine(sauce) : null

  const lines = [proteinLine, carbLine, vegLine, dairyLine, sauceLine].filter(Boolean)
  const totals = sumPantryLines(lines)
  const proteinName = proteinLine.name
  const carbName = carbLine?.name
  const vegName = vegLine?.name
  const dairyName = dairyLine?.name
  const sauceName = sauceLine?.name

  let name, recipe

  if (carbLine && sauceLine) {
    // Bake / pasta-bake template
    name = `${proteinName} & ${carbName} Bake${dairyLine ? ' with ' + dairyName : ''}`
    recipe = `Brown the ${proteinName.toLowerCase()} in a skillet. Cook the ${carbName.toLowerCase()} and combine with the ${sauceName.toLowerCase()} in a baking dish along with the ${proteinName.toLowerCase()}.`
    if (dairyLine) recipe += ` Top with ${dairyName.toLowerCase()} and bake at 375°F for 20 minutes, until bubbly.`
    else recipe += ` Bake at 375°F for 20 minutes.`
    if (vegLine) recipe += ` Toss in the ${vegName.toLowerCase()} too.`
  } else if (carbLine && vegLine) {
    // Bowl template
    name = `${proteinName} & ${carbName} Bowl`
    recipe = `Cook the ${carbName.toLowerCase()} according to package directions. Sear or sauté the ${proteinName.toLowerCase()} until cooked through, and sauté the ${vegName.toLowerCase()} alongside it. Combine everything in a bowl.`
    if (dairyLine) recipe += ` Finish with ${dairyName.toLowerCase()} on top.`
  } else if (vegLine) {
    // Skillet template
    name = `${proteinName} & ${vegName} Skillet`
    recipe = `Sauté the ${proteinName.toLowerCase()} in a hot pan until cooked through, then add the ${vegName.toLowerCase()} and cook until tender.`
    if (sauceLine) recipe += ` Stir in the ${sauceName.toLowerCase()} and simmer 5 minutes.`
    if (dairyLine) recipe += ` Top with ${dairyName.toLowerCase()}.`
  } else if (carbLine) {
    // Simple protein + carb, no veg
    name = `${proteinName} & ${carbName}`
    recipe = `Cook the ${carbName.toLowerCase()} according to package directions. Season and cook the ${proteinName.toLowerCase()} through, and serve together.`
    if (sauceLine) recipe += ` Spoon the ${sauceName.toLowerCase()} over the top.`
    if (dairyLine) recipe += ` Finish with ${dairyName.toLowerCase()}.`
  } else {
    // Protein-forward, whatever else is on hand
    name = `Simple ${proteinName}${dairyLine ? ' & ' + dairyName : ''}`
    recipe = `Season and cook the ${proteinName.toLowerCase()} through in a hot pan.`
    if (sauceLine) recipe += ` Simmer with the ${sauceName.toLowerCase()}.`
    if (dairyLine) recipe += ` Top with ${dairyName.toLowerCase()}.`
  }

  return {
    id: `pantry-combo-${Date.now()}`,
    name,
    type: 'dinner',
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    servingWeightG: Math.round(totals.grams),
    ingredients: lines.map(l => ({ name: l.name, qty: l.qty, unit: l.unit })),
    recipe,
    isPantryCombo: true,
  }
}
