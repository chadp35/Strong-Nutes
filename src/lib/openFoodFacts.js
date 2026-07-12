// Open Food Facts (openfoodfacts.org) is a free, open, crowd-sourced branded
// food database with no API key or signup required. It's the fastest path to
// "search a real product and get its macros" without standing up a backend.
// Data quality varies by product (it's user-submitted), so this is presented
// as a convenience lookup, not a certified nutrition source.

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'
const TIMEOUT_MS = 10000

async function fetchWithTimeout(url) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error("You're offline — connect to the internet to search or scan.")
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('That took too long — check your connection and try again.')
    }
    throw new Error("Couldn't reach the food database — check your connection and try again.")
  } finally {
    clearTimeout(timer)
  }
}

function normalizeProduct(p, fallbackId) {
  return {
    id: p.code || p.id || fallbackId,
    name: p.product_name || 'Unknown product',
    brand: p.brands ? p.brands.split(',')[0].trim() : '',
    caloriesPer100g: Math.round(p.nutriments['energy-kcal_100g'] || 0),
    proteinPer100g: Math.round((p.nutriments['proteins_100g'] || 0) * 10) / 10,
    carbsPer100g: Math.round((p.nutriments['carbohydrates_100g'] || 0) * 10) / 10,
    fatPer100g: Math.round((p.nutriments['fat_100g'] || 0) * 10) / 10,
    // Not every product has a parsed serving weight — fall back to 100g if absent.
    servingGrams: p.serving_quantity ? Math.round(Number(p.serving_quantity)) : 100,
    servingLabel: p.serving_size || '100 g',
  }
}

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

  const res = await fetchWithTimeout(`${SEARCH_URL}?${params.toString()}`)
  if (!res.ok) throw new Error('Food search failed — try again in a moment.')
  const data = await res.json()

  return (data.products || [])
    .filter(p => p.product_name && p.nutriments && p.nutriments['energy-kcal_100g'] != null)
    .map(p => normalizeProduct(p, p.product_name))
    .slice(0, 12)
}

// Looks up one product by its UPC/EAN barcode — what powers the barcode
// scanner. Same free, no-key Open Food Facts API, just the product-by-code
// endpoint instead of a text search.
export async function getProductByBarcode(barcode) {
  const code = barcode.trim()
  if (!code) throw new Error('No barcode to look up.')

  const fields = 'product_name,brands,nutriments,serving_size,serving_quantity,code'
  const res = await fetchWithTimeout(`${PRODUCT_URL}/${encodeURIComponent(code)}.json?fields=${fields}`)
  if (!res.ok) throw new Error('Barcode lookup failed — try again in a moment.')
  const data = await res.json()

  if (data.status !== 1 || !data.product) {
    throw new Error("No product found for that barcode — it may not be in Open Food Facts yet.")
  }
  const p = data.product
  if (!p.nutriments || p.nutriments['energy-kcal_100g'] == null) {
    throw new Error("Found the product, but it doesn't have nutrition data listed.")
  }
  return normalizeProduct(p, code)
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
