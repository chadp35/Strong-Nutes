// Common branded products people actually buy every week — Walmart's Great
// Value store brand covers most grocery categories, plus a handful of other
// near-universal staples. Shaped identically to an Open Food Facts search
// result so it's a drop-in replacement anywhere OFF results are used —
// the difference is this resolves instantly, no network call.
export const COMMON_BRANDS = [
  // ---- Dairy ----
  { id: 'gv-milk-2pct', name: '2% Milk', brand: 'Great Value', caloriesPer100g: 50, proteinPer100g: 3.3, carbsPer100g: 4.8, fatPer100g: 2, servingGrams: 244, servingLabel: '1 cup' },
  { id: 'gv-milk-whole', name: 'Whole Milk', brand: 'Great Value', caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, servingGrams: 244, servingLabel: '1 cup' },
  { id: 'gv-eggs-large', name: 'Large Eggs', brand: 'Great Value', caloriesPer100g: 143, proteinPer100g: 12.6, carbsPer100g: 0.7, fatPer100g: 9.5, servingGrams: 50, servingLabel: '1 egg' },
  { id: 'gv-cheddar', name: 'Sharp Cheddar Cheese', brand: 'Great Value', caloriesPer100g: 403, proteinPer100g: 24.9, carbsPer100g: 1.3, fatPer100g: 33.1, servingGrams: 28, servingLabel: '1 oz' },
  { id: 'gv-mozzarella', name: 'Shredded Mozzarella', brand: 'Great Value', caloriesPer100g: 280, proteinPer100g: 27.5, carbsPer100g: 3.1, fatPer100g: 17.1, servingGrams: 28, servingLabel: '1 oz' },
  { id: 'gv-string-cheese', name: 'String Cheese', brand: 'Great Value', caloriesPer100g: 286, proteinPer100g: 25, carbsPer100g: 3.6, fatPer100g: 21, servingGrams: 28, servingLabel: '1 stick' },
  { id: 'gv-cottage-cheese', name: 'Cottage Cheese', brand: 'Great Value', caloriesPer100g: 98, proteinPer100g: 11.1, carbsPer100g: 3.4, fatPer100g: 4.3, servingGrams: 226, servingLabel: '1 cup' },
  { id: 'gv-greek-yogurt', name: 'Plain Greek Yogurt', brand: 'Great Value', caloriesPer100g: 59, proteinPer100g: 10.2, carbsPer100g: 3.6, fatPer100g: 0.4, servingGrams: 170, servingLabel: '1 cup' },
  { id: 'chobani-vanilla', name: 'Vanilla Greek Yogurt', brand: 'Chobani', caloriesPer100g: 91, proteinPer100g: 10, carbsPer100g: 10, fatPer100g: 1.7, servingGrams: 150, servingLabel: '1 cup' },
  { id: 'gv-sour-cream', name: 'Sour Cream', brand: 'Great Value', caloriesPer100g: 193, proteinPer100g: 2.4, carbsPer100g: 4.6, fatPer100g: 19, servingGrams: 30, servingLabel: '2 tbsp' },
  { id: 'gv-butter', name: 'Butter', brand: 'Great Value', caloriesPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81.1, servingGrams: 14, servingLabel: '1 tbsp' },
  { id: 'fairlife-milk', name: 'Ultra-Filtered 2% Milk', brand: 'Fairlife', caloriesPer100g: 51, proteinPer100g: 5.1, carbsPer100g: 2.5, fatPer100g: 2, servingGrams: 244, servingLabel: '1 cup' },

  // ---- Meat & protein ----
  { id: 'gv-chicken-breast', name: 'Boneless Skinless Chicken Breast', brand: 'Great Value', caloriesPer100g: 120, proteinPer100g: 22.5, carbsPer100g: 0, fatPer100g: 2.6, servingGrams: 170, servingLabel: '6 oz raw' },
  { id: 'gv-ground-beef-8020', name: 'Ground Beef 80/20', brand: 'Great Value', caloriesPer100g: 254, proteinPer100g: 17.2, carbsPer100g: 0, fatPer100g: 20, servingGrams: 113, servingLabel: '4 oz raw' },
  { id: 'gv-ground-turkey', name: 'Ground Turkey 93/7', brand: 'Great Value', caloriesPer100g: 143, proteinPer100g: 19.3, carbsPer100g: 0, fatPer100g: 7.1, servingGrams: 113, servingLabel: '4 oz raw' },
  { id: 'gv-bacon', name: 'Bacon', brand: 'Great Value', caloriesPer100g: 458, proteinPer100g: 12, carbsPer100g: 1.4, fatPer100g: 45, servingGrams: 28, servingLabel: '3 slices' },
  { id: 'oscar-mayer-turkey', name: 'Deli-Style Turkey Breast', brand: 'Oscar Mayer', caloriesPer100g: 100, proteinPer100g: 18, carbsPer100g: 3, fatPer100g: 1, servingGrams: 56, servingLabel: '2 oz' },
  { id: 'gv-tuna-water', name: 'Chunk Light Tuna in Water', brand: 'Great Value', caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 0.8, servingGrams: 142, servingLabel: '1 can, drained' },
  { id: 'gv-canned-chicken', name: 'Canned Chicken Breast', brand: 'Great Value', caloriesPer100g: 110, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 1.5, servingGrams: 142, servingLabel: '1 can, drained' },
  { id: 'gv-frozen-chicken-strips', name: 'Frozen Grilled Chicken Breast Strips', brand: 'Great Value', caloriesPer100g: 110, proteinPer100g: 20, carbsPer100g: 2, fatPer100g: 2.5, servingGrams: 84, servingLabel: '3 oz' },

  // ---- Pantry staples ----
  { id: 'gv-white-rice', name: 'Long Grain White Rice', brand: 'Great Value', caloriesPer100g: 365, proteinPer100g: 7.1, carbsPer100g: 80, fatPer100g: 0.7, servingGrams: 45, servingLabel: '1/4 cup dry' },
  { id: 'gv-brown-rice', name: 'Brown Rice', brand: 'Great Value', caloriesPer100g: 370, proteinPer100g: 7.9, carbsPer100g: 77.2, fatPer100g: 2.9, servingGrams: 45, servingLabel: '1/4 cup dry' },
  { id: 'gv-rolled-oats', name: 'Old Fashioned Rolled Oats', brand: 'Great Value', caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.3, fatPer100g: 6.9, servingGrams: 40, servingLabel: '1/2 cup dry' },
  { id: 'gv-spaghetti', name: 'Spaghetti', brand: 'Great Value', caloriesPer100g: 371, proteinPer100g: 13, carbsPer100g: 74.7, fatPer100g: 1.5, servingGrams: 56, servingLabel: '2 oz dry' },
  { id: 'barilla-penne', name: 'Penne Pasta', brand: 'Barilla', caloriesPer100g: 353, proteinPer100g: 12, carbsPer100g: 71, fatPer100g: 1.5, servingGrams: 56, servingLabel: '2 oz dry' },
  { id: 'gv-black-beans', name: 'Canned Black Beans', brand: 'Great Value', caloriesPer100g: 91, proteinPer100g: 6.1, carbsPer100g: 16.6, fatPer100g: 0.3, servingGrams: 130, servingLabel: '1/2 cup, drained' },
  { id: 'gv-kidney-beans', name: 'Canned Kidney Beans', brand: 'Great Value', caloriesPer100g: 88, proteinPer100g: 6, carbsPer100g: 15.7, fatPer100g: 0.3, servingGrams: 130, servingLabel: '1/2 cup, drained' },
  { id: 'gv-diced-tomatoes', name: 'Canned Diced Tomatoes', brand: 'Great Value', caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 4, fatPer100g: 0.1, servingGrams: 121, servingLabel: '1/2 cup' },
  { id: 'gv-peanut-butter', name: 'Creamy Peanut Butter', brand: 'Great Value', caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, servingGrams: 32, servingLabel: '2 tbsp' },
  { id: 'jif-peanut-butter', name: 'Creamy Peanut Butter', brand: 'Jif', caloriesPer100g: 594, proteinPer100g: 22, carbsPer100g: 22, fatPer100g: 50, servingGrams: 32, servingLabel: '2 tbsp' },
  { id: 'gv-honey', name: 'Honey', brand: 'Great Value', caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82.4, fatPer100g: 0, servingGrams: 21, servingLabel: '1 tbsp' },
  { id: 'gv-white-bread', name: 'White Sandwich Bread', brand: 'Great Value', caloriesPer100g: 266, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.3, servingGrams: 25, servingLabel: '1 slice' },
  { id: 'gv-wheat-bread', name: 'Whole Wheat Bread', brand: 'Great Value', caloriesPer100g: 252, proteinPer100g: 12, carbsPer100g: 43, fatPer100g: 3.6, servingGrams: 28, servingLabel: '1 slice' },
  { id: 'gv-flour-tortillas', name: 'Flour Tortillas', brand: 'Great Value', caloriesPer100g: 312, proteinPer100g: 8.2, carbsPer100g: 51.4, fatPer100g: 7.6, servingGrams: 45, servingLabel: '1 tortilla' },
  { id: 'gv-mayo', name: 'Mayonnaise', brand: 'Great Value', caloriesPer100g: 680, proteinPer100g: 1, carbsPer100g: 0.6, fatPer100g: 75, servingGrams: 14, servingLabel: '1 tbsp' },
  { id: 'gv-ketchup', name: 'Tomato Ketchup', brand: 'Great Value', caloriesPer100g: 112, proteinPer100g: 1.2, carbsPer100g: 27, fatPer100g: 0.3, servingGrams: 17, servingLabel: '1 tbsp' },
  { id: 'gv-salsa', name: 'Chunky Salsa', brand: 'Great Value', caloriesPer100g: 36, proteinPer100g: 1.6, carbsPer100g: 7.6, fatPer100g: 0.2, servingGrams: 32, servingLabel: '2 tbsp' },
  { id: 'kraft-mac-cheese', name: 'Macaroni & Cheese', brand: 'Kraft', caloriesPer100g: 380, proteinPer100g: 10, carbsPer100g: 62, fatPer100g: 11, servingGrams: 70, servingLabel: '1 cup prepared' },

  // ---- Snacks ----
  { id: 'gv-almonds', name: 'Whole Natural Almonds', brand: 'Great Value', caloriesPer100g: 579, proteinPer100g: 21.2, carbsPer100g: 21.6, fatPer100g: 49.9, servingGrams: 28, servingLabel: '1 oz' },
  { id: 'gv-trail-mix', name: 'Trail Mix', brand: 'Great Value', caloriesPer100g: 481, proteinPer100g: 14, carbsPer100g: 39, fatPer100g: 31, servingGrams: 40, servingLabel: '1/4 cup' },
  { id: 'gv-tortilla-chips', name: 'Tortilla Chips', brand: 'Great Value', caloriesPer100g: 489, proteinPer100g: 7, carbsPer100g: 63, fatPer100g: 24, servingGrams: 28, servingLabel: '1 oz' },
  { id: 'gv-cheddar-crackers', name: 'Baked Cheddar Crackers', brand: 'Great Value', caloriesPer100g: 500, proteinPer100g: 9, carbsPer100g: 61, fatPer100g: 24, servingGrams: 30, servingLabel: '~27 crackers' },
  { id: 'quest-bar', name: 'Protein Bar', brand: 'Quest', caloriesPer100g: 345, proteinPer100g: 36, carbsPer100g: 36, fatPer100g: 14, servingGrams: 60, servingLabel: '1 bar' },
  { id: 'gv-hummus', name: 'Classic Hummus', brand: 'Great Value', caloriesPer100g: 240, proteinPer100g: 7, carbsPer100g: 20, fatPer100g: 16, servingGrams: 28, servingLabel: '2 tbsp' },
  { id: 'gv-guacamole', name: 'Guacamole', brand: 'Great Value', caloriesPer100g: 150, proteinPer100g: 2, carbsPer100g: 8, fatPer100g: 13, servingGrams: 30, servingLabel: '2 tbsp' },

  // ---- Frozen & produce ----
  { id: 'gv-frozen-broccoli', name: 'Frozen Broccoli Florets', brand: 'Great Value', caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 6.6, fatPer100g: 0.4, servingGrams: 91, servingLabel: '1 cup' },
  { id: 'gv-frozen-mixed-veg', name: 'Frozen Mixed Vegetables', brand: 'Great Value', caloriesPer100g: 65, proteinPer100g: 2.9, carbsPer100g: 13, fatPer100g: 0.5, servingGrams: 91, servingLabel: '1 cup' },
  { id: 'gv-baby-carrots', name: 'Baby Carrots', brand: 'Great Value', caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 9.6, fatPer100g: 0.2, servingGrams: 85, servingLabel: '~10 carrots' },
  { id: 'kirkland-chicken-breast', name: 'Boneless Skinless Chicken Breast', brand: 'Kirkland Signature', caloriesPer100g: 120, proteinPer100g: 22.5, carbsPer100g: 0, fatPer100g: 2.6, servingGrams: 170, servingLabel: '6 oz raw' },

  // ---- Beverages (non-alcoholic) ----
  { id: 'gv-orange-juice', name: '100% Orange Juice', brand: 'Great Value', caloriesPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10.4, fatPer100g: 0.2, servingGrams: 248, servingLabel: '1 cup' },
  { id: 'gv-apple-juice', name: '100% Apple Juice', brand: 'Great Value', caloriesPer100g: 46, proteinPer100g: 0.1, carbsPer100g: 11.3, fatPer100g: 0.1, servingGrams: 248, servingLabel: '1 cup' },
  { id: 'premier-protein-shake', name: 'Chocolate Protein Shake', brand: 'Premier Protein', caloriesPer100g: 55, proteinPer100g: 10.3, carbsPer100g: 1.7, fatPer100g: 1, servingGrams: 325, servingLabel: '11 oz' },
]

export function searchCommonBrands(query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0 || query.trim().length < 2) return []
  return COMMON_BRANDS.filter(p => {
    const haystack = `${p.name} ${p.brand}`.toLowerCase()
    return words.every(w => haystack.includes(w))
  }).slice(0, 15)
}
