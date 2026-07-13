import { COMMON_BRANDS } from '../data/commonBrands.js'

// Instant, synchronous, no network — searches the curated common-brands list
// plus whatever this person has previously scanned or found via web search
// (their personal "discovered products" cache, which only grows over time).
// discoveredProducts are checked first since they're things this exact
// person has actually used before.
//
// Tokenized so a combined query like "great value chicken" matches even
// though "chicken" is in the name and "great value" is in the brand — every
// word in the query has to appear somewhere across name+brand together.
export function searchLocalProducts(query, discoveredProducts = []) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0 || query.trim().length < 2) return []

  const seen = new Set()
  const results = []
  for (const p of [...discoveredProducts, ...COMMON_BRANDS]) {
    if (seen.has(p.id)) continue
    const haystack = `${p.name} ${p.brand || ''}`.toLowerCase()
    if (words.every(w => haystack.includes(w))) {
      seen.add(p.id)
      results.push(p)
      if (results.length >= 15) break
    }
  }
  return results
}
