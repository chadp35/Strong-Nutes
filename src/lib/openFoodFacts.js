// Open Food Facts (openfoodfacts.org) is a free, open, crowd-sourced branded
// food database with no API key or signup required. It's the fastest path to
// "search a real product and get its macros" without standing up a backend.
// Data quality varies by product (it's user-submitted), so this is presented
// as a convenience lookup, not a certified nutrition source.

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'

export async function searchBrandedFoods(query) {
  const q = query.trim()
  if (q.length < 2) return []

  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
  })

  const res = await fetch(`${SEARCH_URL}?${params.toString()}`)
  if (!res.ok) throw new Error('Food search failed — try again in a moment.')
  const data = await res.json()

  return (data.products || [])
    .filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null)
    .map(p => ({
      id: p.code || p.id || p.product_name,
      name: p.product_name,
      brand: p.brands ? p.brands.split(',')[0].trim() : '',
      caloriesPer100g: Math.round(p.nutriments['energy-kcal_100g'] || 0),
      proteinPer100g: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
      carbsPer100g: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
      fatPer100g: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
      // Not every product has a parsed serving weight — fall back to 100g if absent.
      servingGrams: p.serving_quantity ? Math.round(Number(p.serving_quantity)) : 100,
      servingLabel: p.serving_size || '100 g',
    }))
    .slice(0, 12)
}

// Computes actual macros for a given gram amount of a branded food.
export function macrosForGrams(food, grams) {
  const factor = grams / 100
  return {
    calories: Math.round(food.caloriesPer100g * factor),
    protein: Math.round(food.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(food.carbsPer100g * factor * 10) / 10,
    fat: Math.round(food.fatPer100g * factor * 10) / 10,
  }
}
