// Keyword-based detection, not certified compliance. This is genuinely
// important to be honest about: it catches the common, obvious cases (an
// ingredient literally named "peanut butter" trips the peanut filter) but it
// can't verify cross-contamination, processing facilities, or hidden
// derivatives — that requires reading actual labels or certification marks.
// Halal and kosher especially: this excludes the most universally-recognized
// disqualifiers (pork, non-fish seafood for kosher) but does NOT verify
// slaughter method, certification, or kosher meat/dairy separation. Treat
// this as a helpful first filter, not a substitute for checking the label.

export const ALLERGEN_OPTIONS = [
  { key: 'peanuts', label: 'Peanuts', keywords: ['peanut'] },
  { key: 'treenuts', label: 'Tree nuts', keywords: ['almond', 'cashew', 'walnut', 'pecan', 'pistachio', 'hazelnut', 'macadamia'] },
  { key: 'shellfish', label: 'Shellfish', keywords: ['shrimp', 'crab', 'lobster', 'shellfish', 'prawn', 'mussel', 'clam', 'oyster'] },
  { key: 'fish', label: 'Fish', keywords: ['salmon', 'tuna', 'cod', 'tilapia', 'mahi', 'haddock', 'mackerel', 'fish'] },
  { key: 'dairy', label: 'Dairy', keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream'] },
  { key: 'egg', label: 'Eggs', keywords: ['egg'] },
  { key: 'gluten', label: 'Gluten / Wheat', keywords: ['wheat', 'flour', 'bread', 'tortilla', 'pasta', 'cracker', 'oats'] },
  { key: 'soy', label: 'Soy', keywords: ['soy', 'tofu', 'edamame', 'tempeh'] },
]

export const DIETARY_FRAMEWORK_OPTIONS = [
  { key: 'none', label: 'No specific framework' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
]

const MEAT_KEYWORDS = ['chicken', 'turkey', 'beef', 'pork', 'bacon', 'sausage', 'steak', 'lamb', 'bison', 'ham']
const SEAFOOD_KEYWORDS = ['salmon', 'tuna', 'shrimp', 'fish', 'crab', 'lobster', 'cod', 'tilapia', 'mahi', 'haddock', 'mackerel', 'mussel', 'clam', 'oyster']
const NON_FISH_SEAFOOD_KEYWORDS = ['shrimp', 'crab', 'lobster', 'mussel', 'clam', 'oyster'] // not kosher regardless of "fish" status
const PORK_KEYWORDS = ['pork', 'bacon', 'ham']
const VEGAN_EXTRA_EXCLUDE = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'honey']

function itemText(item) {
  const ingredientNames = (item.ingredients || []).map(i => (i.name || '').toLowerCase())
  const name = (item.name || '').toLowerCase()
  return [name, ...ingredientNames]
}

function hasAnyKeyword(item, keywords) {
  const texts = itemText(item)
  return keywords.some(kw => texts.some(t => t.includes(kw)))
}

// Checks a meal/side/recipe/store-item against a list of allergy keys
// (e.g. ['peanuts', 'shellfish']). Works off ingredient names when
// available (foods.js, sides.js, custom recipes) and falls back to the
// item's own name for things like store items that don't list ingredients.
export function conflictsWithAllergies(item, allergyKeys) {
  if (!allergyKeys || allergyKeys.length === 0) return false
  return allergyKeys.some(key => {
    const option = ALLERGEN_OPTIONS.find(a => a.key === key)
    if (!option) return false
    return hasAnyKeyword(item, option.keywords)
  })
}

export function conflictsWithDiet(item, dietaryFramework) {
  if (!dietaryFramework || dietaryFramework === 'none') return false
  switch (dietaryFramework) {
    case 'vegan':
      return hasAnyKeyword(item, MEAT_KEYWORDS) || hasAnyKeyword(item, SEAFOOD_KEYWORDS) || hasAnyKeyword(item, VEGAN_EXTRA_EXCLUDE)
    case 'vegetarian':
      return hasAnyKeyword(item, MEAT_KEYWORDS) || hasAnyKeyword(item, SEAFOOD_KEYWORDS)
    case 'pescatarian':
      return hasAnyKeyword(item, MEAT_KEYWORDS)
    case 'halal':
      return hasAnyKeyword(item, PORK_KEYWORDS)
    case 'kosher':
      return hasAnyKeyword(item, PORK_KEYWORDS) || hasAnyKeyword(item, NON_FISH_SEAFOOD_KEYWORDS)
    default:
      return false
  }
}

// The one function most callers actually want: true if this item should be
// excluded from automatic suggestions for this person, for either reason.
export function isExcludedForPerson(item, { allergies = [], dietaryFramework = 'none' } = {}) {
  return conflictsWithAllergies(item, allergies) || conflictsWithDiet(item, dietaryFramework)
}

export function filterExcludedItems(items, personSettings) {
  return items.filter(item => !isExcludedForPerson(item, personSettings))
}
