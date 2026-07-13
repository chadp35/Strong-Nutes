// Curated reference data at the CHAIN level (e.g. "Dollar General," "RaceTrac"),
// not live per-location inventory — there's no free API that knows what's
// actually on the shelf at a specific address right now. What's here reflects
// what's generally/reliably available across most locations of that chain.
// Exact stock still varies by store, so the label is always the final word.

import { filterExcludedItems } from './allergens.js'

export const CHAINS = [
  // Convenience / gas station
  { key: 'generic_convenience', label: 'Convenience store / gas station (other)', category: 'convenience' },
  { key: '7eleven', label: '7-Eleven', category: 'convenience' },
  { key: 'circlek', label: 'Circle K', category: 'convenience' },
  { key: 'racetrac', label: 'RaceTrac / QuikTrip', category: 'convenience' },
  { key: 'wawa', label: 'Wawa / Sheetz', category: 'convenience' },
  { key: 'caseys', label: "Casey's General Store", category: 'convenience' },
  { key: 'speedway', label: 'Speedway / Cumberland Farms', category: 'convenience' },
  { key: 'kumandgo', label: 'Kum & Go / Maverik', category: 'convenience' },
  { key: 'travelcenter', label: "Love's / Pilot / TA Travel Center", category: 'convenience', note: 'Bigger footprint than a typical gas station — often has a fuller grab-and-go cooler and a fast food counter.' },
  { key: 'aafes_shoppette', label: 'AAFES Shoppette (base gas station)', category: 'convenience', note: 'Assortment is generally similar to a civilian convenience store — varies by installation.' },

  // Dollar / discount
  { key: 'dollargeneral', label: 'Dollar General / Family Dollar', category: 'dollar', note: 'Mostly shelf-stable — fresh and refrigerated options are limited at most locations.' },

  // Pharmacy
  { key: 'cvs', label: 'CVS', category: 'pharmacy' },
  { key: 'walgreens', label: 'Walgreens', category: 'pharmacy' },

  // Coffee
  { key: 'starbucks', label: 'Starbucks', category: 'coffee' },
  { key: 'dunkin', label: "Dunkin'", category: 'coffee' },
  { key: 'timhortons', label: "Tim Hortons", category: 'coffee' },
  { key: 'peets', label: "Peet's Coffee", category: 'coffee' },

  // Grocery
  { key: 'walmart', label: 'Walmart', category: 'grocery' },
  { key: 'target', label: 'Target', category: 'grocery' },
  { key: 'publix', label: 'Publix', category: 'grocery' },
  { key: 'kroger', label: 'Kroger', category: 'grocery' },
  { key: 'traderjoes', label: "Trader Joe's", category: 'grocery' },
  { key: 'wholefoods', label: 'Whole Foods', category: 'grocery' },
  { key: 'aldi', label: 'Aldi', category: 'grocery' },
  { key: 'warehouse_club', label: 'Costco / Sam\'s Club / BJ\'s', category: 'grocery', note: 'Prepared/rotisserie items are usually sold as large family-size portions — plan to portion and freeze.' },
  { key: 'aafes_commissary', label: 'Commissary / Exchange (base grocery)', category: 'grocery', note: 'Assortment is generally similar to a civilian grocery store.' },

  // Fast food
  { key: 'chipotle', label: 'Chipotle', category: 'fastfood' },
  { key: 'subway', label: 'Subway', category: 'fastfood' },
  { key: 'chickfila', label: 'Chick-fil-A', category: 'fastfood' },
  { key: 'mcdonalds', label: "McDonald's", category: 'fastfood' },
  { key: 'wendys', label: "Wendy's", category: 'fastfood' },
  { key: 'burgerking', label: 'Burger King', category: 'fastfood' },
  { key: 'tacobell', label: 'Taco Bell', category: 'fastfood' },
  { key: 'sonic', label: 'Sonic', category: 'fastfood' },
  { key: 'panera', label: 'Panera Bread', category: 'fastfood' },
  { key: 'jimmyjohns', label: "Jimmy John's", category: 'fastfood' },
  { key: 'jerseymikes', label: "Jersey Mike's", category: 'fastfood' },
  { key: 'pandaexpress', label: 'Panda Express', category: 'fastfood' },
  { key: 'culvers', label: "Culver's", category: 'fastfood' },
  { key: 'popeyes', label: 'Popeyes', category: 'fastfood' },
  { key: 'generic_fastfood', label: 'Fast food (other)', category: 'fastfood' },
]

// Base item pools by category — shared across every chain in that category,
// since e.g. most gas-station convenience stores carry roughly the same
// staples regardless of banner.
const CATEGORY_ITEMS = [
  // ---- convenience ----
  { id: 'sn1', name: 'Beef jerky (1 oz bag)', category: 'convenience', mealType: 'snack', calories: 80, protein: 11, carbs: 3, fat: 2 },
  { id: 'sn2', name: 'String cheese (1 stick)', category: 'convenience', mealType: 'snack', calories: 80, protein: 7, carbs: 1, fat: 6 },
  { id: 'sn3', name: 'Hard-boiled eggs, 2-pack', category: 'convenience', mealType: 'snack', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { id: 'sn4', name: 'Roasted almonds (1 oz pack)', category: 'convenience', mealType: 'snack', calories: 170, protein: 6, carbs: 6, fat: 15 },
  { id: 'sn5', name: 'Greek yogurt cup (cooler section)', category: 'convenience', mealType: 'snack', calories: 130, protein: 12, carbs: 9, fat: 5 },
  { id: 'sn6', name: 'Banana', category: 'convenience', mealType: 'snack', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { id: 'sn7', name: 'Protein shake (Premier Protein, 11 oz)', category: 'convenience', mealType: 'snack', calories: 160, protein: 30, carbs: 5, fat: 3 },
  { id: 'sn8', name: 'Turkey jerky', category: 'convenience', mealType: 'snack', calories: 70, protein: 11, carbs: 4, fat: 1 },
  { id: 'sn9', name: 'Trail mix pack (2 oz)', category: 'convenience', mealType: 'snack', calories: 280, protein: 8, carbs: 24, fat: 18 },

  // ---- dollar ----
  { id: 'dl1', name: 'Canned chicken breast (shelf-stable)', category: 'dollar', mealType: 'snack', calories: 70, protein: 15, carbs: 0, fat: 1 },
  { id: 'dl2', name: 'Tuna packet', category: 'dollar', mealType: 'snack', calories: 60, protein: 13, carbs: 0, fat: 1 },
  { id: 'dl3', name: 'Peanuts (shelf-stable, small bag)', category: 'dollar', mealType: 'snack', calories: 170, protein: 7, carbs: 6, fat: 14 },
  { id: 'dl4', name: 'Protein bar', category: 'dollar', mealType: 'snack', calories: 200, protein: 15, carbs: 22, fat: 8 },
  { id: 'dl5', name: 'Shelf-stable milk box', category: 'dollar', mealType: 'snack', calories: 130, protein: 8, carbs: 12, fat: 5 },

  // ---- pharmacy ----
  { id: 'ph1', name: 'Quest protein bar', category: 'pharmacy', mealType: 'snack', calories: 200, protein: 21, carbs: 21, fat: 8 },
  { id: 'ph2', name: 'KIND bar', category: 'pharmacy', mealType: 'snack', calories: 190, protein: 6, carbs: 16, fat: 13 },
  { id: 'ph3', name: 'Greek yogurt cup', category: 'pharmacy', mealType: 'snack', calories: 130, protein: 12, carbs: 9, fat: 5 },
  { id: 'ph4', name: 'String cheese (1 stick)', category: 'pharmacy', mealType: 'snack', calories: 80, protein: 7, carbs: 1, fat: 6 },
  { id: 'ph5', name: 'Roasted almonds (1 oz pack)', category: 'pharmacy', mealType: 'snack', calories: 170, protein: 6, carbs: 6, fat: 15 },
  { id: 'ph6', name: 'Protein shake, ready-to-drink', category: 'pharmacy', mealType: 'snack', calories: 160, protein: 30, carbs: 5, fat: 3 },

  // ---- coffee ----
  { id: 'cf1', name: 'Egg white & roasted red pepper egg bites (2 pc)', category: 'coffee', mealType: 'breakfast', calories: 170, protein: 13, carbs: 13, fat: 7 },
  { id: 'cf2', name: 'Turkey bacon & egg white sandwich', category: 'coffee', mealType: 'breakfast', calories: 230, protein: 17, carbs: 26, fat: 6 },
  { id: 'cf3', name: 'Protein box (eggs, cheese, fruit, nuts)', category: 'coffee', mealType: 'snack', calories: 470, protein: 20, carbs: 32, fat: 29 },
  { id: 'cf4', name: 'Plain oatmeal', category: 'coffee', mealType: 'breakfast', calories: 160, protein: 5, carbs: 28, fat: 2.5 },
  { id: 'cf5', name: 'Egg white veggie flatbread', category: 'coffee', mealType: 'breakfast', calories: 280, protein: 15, carbs: 34, fat: 10 },

  // ---- grocery ----
  { id: 'gr1', name: 'Rotisserie chicken breast (deli, ~3 oz)', category: 'grocery', mealType: 'lunch', calories: 140, protein: 25, carbs: 0, fat: 4 },
  { id: 'gr2', name: 'Pre-cooked shrimp cup', category: 'grocery', mealType: 'snack', calories: 90, protein: 18, carbs: 1, fat: 1 },
  { id: 'gr3', name: 'Veggie tray with hummus (small)', category: 'grocery', mealType: 'snack', calories: 150, protein: 5, carbs: 15, fat: 8 },
  { id: 'gr4', name: 'Cottage cheese single cup', category: 'grocery', mealType: 'snack', calories: 90, protein: 11, carbs: 6, fat: 2 },
  { id: 'gr5', name: 'Tuna packet', category: 'grocery', mealType: 'snack', calories: 60, protein: 13, carbs: 0, fat: 1 },
  { id: 'gr6', name: 'Pre-made salad with grilled chicken (deli)', category: 'grocery', mealType: 'lunch', calories: 350, protein: 30, carbs: 15, fat: 18 },
  { id: 'gr7', name: 'Greek yogurt cup', category: 'grocery', mealType: 'snack', calories: 130, protein: 12, carbs: 9, fat: 5 },
  { id: 'gr8', name: 'Protein shake, ready-to-drink', category: 'grocery', mealType: 'snack', calories: 160, protein: 30, carbs: 5, fat: 3 },

  // ---- fastfood ----
  { id: 'ff1', name: 'Grilled chicken sandwich, no mayo', category: 'fastfood', mealType: 'lunch', calories: 350, protein: 35, carbs: 35, fat: 8 },
  { id: 'ff3', name: 'Side salad with grilled chicken', category: 'fastfood', mealType: 'lunch', calories: 300, protein: 30, carbs: 12, fat: 14 },
  { id: 'ff5', name: 'Grilled chicken wrap', category: 'fastfood', mealType: 'lunch', calories: 400, protein: 30, carbs: 30, fat: 18 },
]

// Chain-specific items — where a particular chain's real assortment differs
// enough from the generic category to be worth calling out by name.
const CHAIN_ITEMS = [
  { id: 'wa1', name: 'Turkey hoagie, small, no cheese (made to order)', chain: 'wawa', mealType: 'lunch', calories: 320, protein: 24, carbs: 40, fat: 6 },
  { id: 'wa2', name: 'Fresh fruit cup', chain: 'wawa', mealType: 'snack', calories: 80, protein: 1, carbs: 20, fat: 0 },
  { id: 'rt1', name: 'Grilled chicken wrap (hot case)', chain: 'racetrac', mealType: 'lunch', calories: 380, protein: 28, carbs: 32, fat: 15 },
  { id: 'pb1', name: 'Turkey sub, no cheese, from the deli', chain: 'publix', mealType: 'lunch', calories: 340, protein: 24, carbs: 45, fat: 6 },
  { id: 'pb2', name: 'Boiled peanuts (small)', chain: 'publix', mealType: 'snack', calories: 200, protein: 9, carbs: 15, fat: 12 },
  { id: 'dg1', name: 'Peanut butter crackers', chain: 'dollargeneral', mealType: 'snack', calories: 190, protein: 4, carbs: 22, fat: 10 },
  { id: 'sb1', name: 'Cold brew with nonfat milk, no sugar', chain: 'starbucks', mealType: 'snack', calories: 35, protein: 3, carbs: 5, fat: 0 },
  { id: 'du1', name: 'Wake-Up Wrap, egg & cheese', chain: 'dunkin', mealType: 'breakfast', calories: 230, protein: 9, carbs: 20, fat: 13 },
  { id: 'cp1', name: 'Chicken burrito bowl (rice, beans, salsa, no cheese/sour cream)', chain: 'chipotle', mealType: 'lunch', calories: 555, protein: 40, carbs: 55, fat: 17 },
  { id: 'sw1', name: '6" turkey sub on wheat, veggies, mustard', chain: 'subway', mealType: 'lunch', calories: 280, protein: 18, carbs: 46, fat: 4 },
  { id: 'cf1x', name: 'Grilled chicken sandwich, no bun', chain: 'chickfila', mealType: 'lunch', calories: 180, protein: 23, carbs: 5, fat: 8 },
  { id: 'cf2x', name: 'Grilled chicken nuggets, 8 ct', chain: 'chickfila', mealType: 'snack', calories: 130, protein: 25, carbs: 1, fat: 3 },

  // ---- newer chains ----
  { id: 'sp1', name: 'Hard-boiled eggs, 2-pack', chain: 'speedway', mealType: 'snack', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { id: 'tc1', name: 'Grilled chicken sandwich (hot case)', chain: 'travelcenter', mealType: 'lunch', calories: 380, protein: 30, carbs: 35, fat: 13 },
  { id: 'kg1', name: 'Protein box (eggs, cheese, nuts)', chain: 'kumandgo', mealType: 'snack', calories: 400, protein: 18, carbs: 25, fat: 26 },

  { id: 'th1', name: 'Egg white & spinach wrap', chain: 'timhortons', mealType: 'breakfast', calories: 280, protein: 15, carbs: 33, fat: 9 },
  { id: 'pe1', name: 'Cold brew with nonfat milk, no sugar', chain: 'peets', mealType: 'snack', calories: 35, protein: 3, carbs: 5, fat: 0 },

  { id: 'tj1', name: 'Grilled chicken strips (refrigerated case)', chain: 'traderjoes', mealType: 'lunch', calories: 220, protein: 38, carbs: 2, fat: 6 },
  { id: 'tj2', name: 'Shelled edamame cup', chain: 'traderjoes', mealType: 'snack', calories: 120, protein: 11, carbs: 9, fat: 5 },
  { id: 'wf1', name: 'Rotisserie chicken breast (deli, ~4 oz)', chain: 'wholefoods', mealType: 'lunch', calories: 190, protein: 35, carbs: 0, fat: 5 },
  { id: 'wf2', name: 'Chicken salad bar bowl, build-your-own', chain: 'wholefoods', mealType: 'lunch', calories: 400, protein: 32, carbs: 20, fat: 20, note: 'Estimate — actual macros depend on what you build.' },
  { id: 'al1', name: 'Grilled chicken breast strips (refrigerated)', chain: 'aldi', mealType: 'lunch', calories: 130, protein: 26, carbs: 1, fat: 2 },
  { id: 'wc1', name: 'Rotisserie chicken (whole — portion to ~4 oz)', chain: 'warehouse_club', mealType: 'lunch', calories: 190, protein: 34, carbs: 0, fat: 5 },
  { id: 'wc2', name: 'Individual Greek yogurt cup (multipack)', chain: 'warehouse_club', mealType: 'snack', calories: 130, protein: 12, carbs: 9, fat: 5 },

  { id: 'mc1', name: 'Grilled chicken sandwich (no mayo)', chain: 'mcdonalds', mealType: 'lunch', calories: 350, protein: 37, carbs: 42, fat: 4.5 },
  { id: 'mc2', name: 'Egg McMuffin', chain: 'mcdonalds', mealType: 'breakfast', calories: 310, protein: 17, carbs: 30, fat: 13 },
  { id: 'wn1', name: "Grilled chicken sandwich, no mayo", chain: 'wendys', mealType: 'lunch', calories: 370, protein: 34, carbs: 36, fat: 9 },
  { id: 'wn2', name: 'Chili, small', chain: 'wendys', mealType: 'snack', calories: 190, protein: 15, carbs: 19, fat: 6 },
  { id: 'bk1', name: 'Grilled chicken sandwich, no mayo', chain: 'burgerking', mealType: 'lunch', calories: 380, protein: 30, carbs: 45, fat: 9 },
  { id: 'tb1', name: 'Power Bowl, chicken, no cheese/sour cream', chain: 'tacobell', mealType: 'lunch', calories: 470, protein: 26, carbs: 44, fat: 21 },
  { id: 'tb2', name: 'Soft chicken tacos, fresco style, 2 ct', chain: 'tacobell', mealType: 'snack', calories: 280, protein: 20, carbs: 34, fat: 8 },
  { id: 'sn1x', name: 'Grilled chicken wrap', chain: 'sonic', mealType: 'lunch', calories: 380, protein: 26, carbs: 34, fat: 16 },
  { id: 'pn1', name: 'Chicken & rice bowl, no cheese', chain: 'panera', mealType: 'lunch', calories: 380, protein: 33, carbs: 40, fat: 9 },
  { id: 'pn2', name: 'Greek yogurt parfait with berries', chain: 'panera', mealType: 'breakfast', calories: 300, protein: 15, carbs: 45, fat: 7 },
  { id: 'jj1', name: "Unwich (lettuce wrap), turkey", chain: 'jimmyjohns', mealType: 'lunch', calories: 250, protein: 24, carbs: 8, fat: 14 },
  { id: 'jm1', name: 'Turkey sub, mini, no cheese, on wheat', chain: 'jerseymikes', mealType: 'lunch', calories: 300, protein: 22, carbs: 42, fat: 6 },
  { id: 'pd1', name: 'Grilled teriyaki chicken (no rice/noodles)', chain: 'pandaexpress', mealType: 'lunch', calories: 275, protein: 36, carbs: 12, fat: 9 },
  { id: 'cv1', name: 'Grilled chicken sandwich, no mayo', chain: 'culvers', mealType: 'lunch', calories: 380, protein: 34, carbs: 40, fat: 9 },
  { id: 'pp1', name: 'Blackened chicken tenders, 3 ct', chain: 'popeyes', mealType: 'lunch', calories: 220, protein: 32, carbs: 3, fat: 8 },
]

export function findStoreOptions({ chainKey, remainingCalories, remainingProtein, mealType = 'any', personSettings = {} }) {
  const chain = CHAINS.find(c => c.key === chainKey)
  if (!chain) return []

  let pool = [
    ...CATEGORY_ITEMS.filter(i => i.category === chain.category),
    ...CHAIN_ITEMS.filter(i => i.chain === chainKey),
  ]
  if (mealType !== 'any') pool = pool.filter(i => i.mealType === mealType)
  pool = filterExcludedItems(pool, personSettings)

  const withinBudget = pool.filter(i => remainingCalories == null || i.calories <= Math.max(remainingCalories, 100))
  const candidates = withinBudget.length > 0 ? withinBudget : pool

  return [...candidates].sort((a, b) => {
    const aFit = remainingProtein > 0 ? Math.min(a.protein / remainingProtein, 1) : 0
    const bFit = remainingProtein > 0 ? Math.min(b.protein / remainingProtein, 1) : 0
    return bFit - aFit
  })
}
