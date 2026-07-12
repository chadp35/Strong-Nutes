// Simple, realistic "close the gap" items — the alternative to scaling a
// recipe's ingredients into awkward fractions (1.55 tortillas is not a real
// thing). These get added alongside a day's fixed breakfast/lunch/dinner when
// there's calories left to fill, and they double as healthy grazing options
// on the shopping list for snacking or fighting cravings at home.
export const SIDES = [
  { id: 'sd1', name: 'Apple', tags: ['quick', 'no-cook', 'vegetarian', 'sweet'], calories: 95, protein: 0, carbs: 25, fat: 0, servingWeightG: 180,
    ingredients: [{ name: 'Apple', qty: 1, unit: 'medium' }], recipe: 'Grab and eat.' },
  { id: 'sd2', name: 'Orange', tags: ['quick', 'no-cook', 'vegetarian', 'sweet'], calories: 62, protein: 1, carbs: 15, fat: 0, servingWeightG: 130,
    ingredients: [{ name: 'Orange', qty: 1, unit: 'medium' }], recipe: 'Grab and eat.' },
  { id: 'sd3', name: 'Banana', tags: ['quick', 'no-cook', 'vegetarian', 'sweet'], calories: 105, protein: 1, carbs: 27, fat: 0, servingWeightG: 120,
    ingredients: [{ name: 'Banana', qty: 1, unit: '' }], recipe: 'Grab and eat.' },
  { id: 'sd4', name: 'Grapes', tags: ['quick', 'no-cook', 'vegetarian', 'sweet'], calories: 62, protein: 1, carbs: 16, fat: 0, servingWeightG: 90,
    ingredients: [{ name: 'Grapes', qty: 1, unit: 'cup' }], recipe: 'Rinse and eat.' },
  { id: 'sd5', name: 'Glass of milk', tags: ['dairy', 'quick', 'no-cook'], calories: 122, protein: 8, carbs: 12, fat: 5, servingWeightG: 245,
    ingredients: [{ name: 'Milk', qty: 1, unit: 'cup' }], recipe: 'Pour and drink.' },
  { id: 'sd6', name: 'Orange juice', tags: ['quick', 'no-cook', 'sweet'], calories: 110, protein: 2, carbs: 26, fat: 0, servingWeightG: 250,
    ingredients: [{ name: 'Orange juice', qty: 1, unit: 'cup' }], recipe: 'Pour and drink.' },
  { id: 'sd7', name: 'Almonds', tags: ['quick', 'no-cook', 'vegetarian'], calories: 164, protein: 6, carbs: 6, fat: 14, servingWeightG: 28,
    ingredients: [{ name: 'Almonds', qty: 1, unit: 'oz' }], recipe: 'Grab a small handful.' },
  { id: 'sd8', name: 'Whole grain crackers', tags: ['quick', 'no-cook', 'vegetarian'], calories: 120, protein: 3, carbs: 20, fat: 3, servingWeightG: 28,
    ingredients: [{ name: 'Whole grain crackers', qty: 6, unit: '' }], recipe: 'Grab and eat.' },
  { id: 'sd9', name: 'Rice cake with peanut butter', tags: ['quick', 'vegetarian'], calories: 130, protein: 4, carbs: 14, fat: 7, servingWeightG: 40,
    ingredients: [{ name: 'Rice cakes', qty: 1, unit: '' }, { name: 'Peanut butter', qty: 1, unit: 'tbsp' }], recipe: 'Spread peanut butter on the rice cake.' },
  { id: 'sd10', name: 'Peanut butter toast', tags: ['quick', 'vegetarian'], calories: 150, protein: 5, carbs: 15, fat: 8, servingWeightG: 45,
    ingredients: [{ name: 'Whole wheat bread', qty: 1, unit: 'slice' }, { name: 'Peanut butter', qty: 1, unit: 'tbsp' }], recipe: 'Toast the bread, spread peanut butter.' },
  { id: 'sd11', name: 'Dark chocolate square', tags: ['quick', 'no-cook', 'sweet'], calories: 50, protein: 1, carbs: 5, fat: 3, servingWeightG: 10,
    ingredients: [{ name: 'Dark chocolate', qty: 1, unit: 'square' }], recipe: 'A small, satisfying way to handle a craving without derailing the day.' },
]

export const ALL_SIDE_TAGS = [...new Set(SIDES.flatMap(s => s.tags))].sort()
