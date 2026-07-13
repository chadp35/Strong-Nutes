import { findIngredient, nutritionForLine } from './recipeBuilder.js'

// Procedurally builds a large, varied set of real meals — full macro math
// via nutritionForLine, not guessed numbers — by crossing a roster of
// proteins against carbs/veggies/cheeses/fruits through a handful of
// realistic cooking templates (bowl, stir-fry, sheet pan, pasta bake, wrap,
// egg scramble, oatmeal, yogurt/cottage-cheese snack). This is what actually
// gives the planner and "regenerate" enough real variety to work with,
// beyond the small hand-written meal list.

function displayName(ingredient) {
  return ingredient.name.replace(/\s*\(.*?\)\s*/g, '').trim()
}

function line(id, qty, unit) {
  const ingredient = findIngredient(id)
  const nutrition = nutritionForLine(ingredient, qty, unit)
  return { name: displayName(ingredient), qty, unit, ...nutrition }
}

function sumLines(lines) {
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

function toMeal({ id, name, type, tags, lines, recipe }) {
  const totals = sumLines(lines)
  return {
    id, name, type, tags,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    servingWeightG: Math.round(totals.grams),
    ingredients: lines.map(l => ({ name: l.name, qty: l.qty, unit: l.unit })),
    recipe,
  }
}

const PROTEINS = [
  { id: 'chicken-breast', qty: 6, unit: 'oz', dietTag: 'meat' },
  { id: 'chicken-thigh', qty: 6, unit: 'oz', dietTag: 'meat' },
  { id: 'ground-turkey', qty: 5, unit: 'oz', dietTag: 'meat' },
  { id: 'turkey-breast', qty: 6, unit: 'oz', dietTag: 'meat' },
  { id: 'lean-ground-beef', qty: 5, unit: 'oz', dietTag: 'meat' },
  { id: 'sirloin-steak', qty: 6, unit: 'oz', dietTag: 'meat' },
  { id: 'pork-tenderloin', qty: 6, unit: 'oz', dietTag: 'meat' },
  { id: 'ground-bison', qty: 5, unit: 'oz', dietTag: 'meat' },
  { id: 'white-fish', qty: 6, unit: 'oz', dietTag: 'seafood' },
  { id: 'salmon', qty: 6, unit: 'oz', dietTag: 'seafood' },
  { id: 'shrimp', qty: 5, unit: 'oz', dietTag: 'seafood' },
  { id: 'tofu-firm', qty: 6, unit: 'oz', dietTag: 'plant-protein' },
  { id: 'tempeh', qty: 5, unit: 'oz', dietTag: 'plant-protein' },
  { id: 'black-beans', qty: 1, unit: 'cup', dietTag: 'plant-protein' },
  { id: 'chickpeas', qty: 1, unit: 'cup', dietTag: 'plant-protein' },
  { id: 'lentils-cooked', qty: 1, unit: 'cup', dietTag: 'plant-protein' },
]

const CARBS = [
  { id: 'white-rice', qty: 0.75, unit: 'cup' },
  { id: 'brown-rice', qty: 0.75, unit: 'cup' },
  { id: 'quinoa', qty: 0.66, unit: 'cup' },
  { id: 'couscous', qty: 0.66, unit: 'cup' },
  { id: 'white-potato', qty: 1, unit: 'medium' },
  { id: 'sweet-potato', qty: 1, unit: 'medium' },
  { id: 'pasta', qty: 1, unit: 'cup' },
  { id: 'whole-wheat-pasta', qty: 1, unit: 'cup' },
]

const VEGGIES = [
  { id: 'broccoli', qty: 1, unit: 'cup' },
  { id: 'spinach', qty: 1.5, unit: 'cup' },
  { id: 'kale', qty: 1.5, unit: 'cup' },
  { id: 'cabbage', qty: 1, unit: 'cup' },
  { id: 'cauliflower', qty: 1, unit: 'cup' },
  { id: 'brussels-sprouts', qty: 1, unit: 'cup' },
  { id: 'mushroom', qty: 1, unit: 'cup' },
  { id: 'bell-pepper', qty: 1, unit: 'each' },
  { id: 'zucchini', qty: 1, unit: 'each' },
  { id: 'asparagus', qty: 8, unit: 'each' },
  { id: 'carrot', qty: 2, unit: 'each' },
  { id: 'green-beans', qty: 1, unit: 'cup' },
]

const FRUITS = [
  { id: 'strawberries', qty: 1, unit: 'cup' },
  { id: 'blueberries', qty: 1, unit: 'cup' },
  { id: 'banana', qty: 1, unit: 'each' },
  { id: 'apple', qty: 1, unit: 'medium' },
  { id: 'mango', qty: 1, unit: 'each' },
  { id: 'pineapple', qty: 1, unit: 'cup' },
]

function pick(arr, offset) {
  return arr[((offset % arr.length) + arr.length) % arr.length]
}

function proteinTags(protein) {
  if (protein.dietTag === 'plant-protein') return ['plant-protein', 'vegetarian']
  return [protein.dietTag]
}

function bowlMeal(protein, carbConf, vegConf, idx) {
  const proteinLine = line(protein.id, protein.qty, protein.unit)
  const carbLine = line(carbConf.id, carbConf.qty, carbConf.unit)
  const vegLine = line(vegConf.id, vegConf.qty, vegConf.unit)
  const oilLine = line('olive-oil', 1, 'tbsp')
  const lines = [proteinLine, carbLine, vegLine, oilLine]
  return toMeal({
    id: `combo-bowl-${protein.id}-${carbConf.id}-${vegConf.id}-${idx}`,
    name: `${proteinLine.name} & ${carbLine.name} Bowl with ${vegLine.name}`,
    type: 'dinner',
    tags: [...proteinTags(protein), 'meal-prep'],
    lines,
    recipe: `Cook the ${carbLine.name.toLowerCase()} according to package directions. Season and cook the ${proteinLine.name.toLowerCase()} through, and sauté the ${vegLine.name.toLowerCase()} until tender. Combine in a bowl with a drizzle of olive oil.`,
  })
}

function stirFryMeal(protein, carbConf, vegConf, idx) {
  const proteinLine = line(protein.id, protein.qty, protein.unit)
  const carbLine = line(carbConf.id, carbConf.qty, carbConf.unit)
  const vegLine = line(vegConf.id, vegConf.qty, vegConf.unit)
  const sauceLine = line('soy-sauce', 1, 'tbsp')
  const lines = [proteinLine, carbLine, vegLine, sauceLine]
  return toMeal({
    id: `combo-stirfry-${protein.id}-${vegConf.id}-${idx}`,
    name: `${proteinLine.name} & ${vegLine.name} Stir-fry`,
    type: 'dinner',
    tags: [...proteinTags(protein), 'savory'],
    lines,
    recipe: `Stir-fry the ${proteinLine.name.toLowerCase()} in a hot pan 3-4 minutes. Add the ${vegLine.name.toLowerCase()} and cook until crisp-tender. Add soy sauce, toss, and serve over ${carbLine.name.toLowerCase()}.`,
  })
}

function sheetPanMeal(protein, vegConf, idx) {
  const proteinLine = line(protein.id, protein.qty, protein.unit)
  const vegLine = line(vegConf.id, vegConf.qty, vegConf.unit)
  const oilLine = line('olive-oil', 1, 'tbsp')
  const lines = [proteinLine, vegLine, oilLine]
  return toMeal({
    id: `combo-sheetpan-${protein.id}-${vegConf.id}-${idx}`,
    name: `Sheet Pan ${proteinLine.name} & ${vegLine.name}`,
    type: 'dinner',
    tags: [...proteinTags(protein), 'low-carb'],
    lines,
    recipe: `Toss the ${proteinLine.name.toLowerCase()} and ${vegLine.name.toLowerCase()} with olive oil, salt, and pepper. Roast at 425°F for 18-22 minutes, until cooked through.`,
  })
}

function pastaBakeMeal(protein, idx) {
  const proteinLine = line(protein.id, protein.qty, protein.unit)
  const pastaLine = line('pasta', 1, 'cup')
  const sauceLine = line('marinara-sauce', 0.75, 'cup')
  const cheeseLine = line('mozzarella', 0.25, 'cup')
  const lines = [proteinLine, pastaLine, sauceLine, cheeseLine]
  return toMeal({
    id: `combo-pastabake-${protein.id}-${idx}`,
    name: `${proteinLine.name} Pasta Bake`,
    type: 'dinner',
    tags: [...proteinTags(protein), 'meal-prep', 'savory'],
    lines,
    recipe: `Cook pasta and brown the ${proteinLine.name.toLowerCase()}. Combine with marinara sauce in a baking dish, top with mozzarella, and bake at 375°F for 20 minutes until bubbly.`,
  })
}

function wrapMeal(protein, vegConf, idx) {
  const proteinLine = line(protein.id, protein.qty, protein.unit)
  const wrapLine = line('flour-tortilla', 1, 'large')
  const vegLine = line(vegConf.id, vegConf.qty, vegConf.unit)
  const lines = [proteinLine, wrapLine, vegLine]
  return toMeal({
    id: `combo-wrap-${protein.id}-${vegConf.id}-${idx}`,
    name: `${proteinLine.name} & ${vegLine.name} Wrap`,
    type: 'lunch',
    tags: [...proteinTags(protein), 'quick'],
    lines,
    recipe: `Cook the ${proteinLine.name.toLowerCase()} through and sauté the ${vegLine.name.toLowerCase()}. Fill the tortilla and roll tightly.`,
  })
}

function eggScrambleMeal(vegConf, idx) {
  const eggLine = line('egg', 3, 'large')
  const vegLine = line(vegConf.id, 0.5, 'cup')
  const cheeseLine = line('cheddar', 0.25, 'cup')
  const oilLine = line('olive-oil', 1, 'tsp')
  const lines = [eggLine, vegLine, cheeseLine, oilLine]
  return toMeal({
    id: `combo-eggscramble-${vegConf.id}-${idx}`,
    name: `${vegLine.name} Egg Scramble`,
    type: 'breakfast',
    tags: ['eggs', 'vegetarian', 'savory'],
    lines,
    recipe: `Sauté the ${vegLine.name.toLowerCase()} in olive oil 2-3 minutes. Add whisked eggs and scramble until set. Top with cheddar.`,
  })
}

function oatmealMeal(fruitConf, idx) {
  const oatLine = line('rolled-oats', 0.5, 'cup')
  const milkLine = line('milk-2pct', 0.75, 'cup')
  const fruitLine = line(fruitConf.id, fruitConf.qty, fruitConf.unit)
  const honeyLine = line('honey', 1, 'tbsp')
  const lines = [oatLine, milkLine, fruitLine, honeyLine]
  return toMeal({
    id: `combo-oatmeal-${fruitConf.id}-${idx}`,
    name: `${fruitLine.name} Oatmeal`,
    type: 'breakfast',
    tags: ['oats', 'vegetarian', 'sweet'],
    lines,
    recipe: `Cook oats with milk over medium heat 5 minutes. Top with ${fruitLine.name.toLowerCase()} and a drizzle of honey.`,
  })
}

function yogurtSnackMeal(fruitConf, idx) {
  const yogurtLine = line('greek-yogurt', 1, 'cup')
  const fruitLine = line(fruitConf.id, fruitConf.qty, fruitConf.unit)
  const lines = [yogurtLine, fruitLine]
  return toMeal({
    id: `combo-yogurt-${fruitConf.id}-${idx}`,
    name: `Greek Yogurt & ${fruitLine.name}`,
    type: 'snack',
    tags: ['dairy', 'vegetarian', 'quick', 'sweet'],
    lines,
    recipe: `Top yogurt with ${fruitLine.name.toLowerCase()}. Done in a minute.`,
  })
}

function cottageCheeseSnackMeal(fruitConf, idx) {
  const ccLine = line('cottage-cheese', 1, 'cup')
  const fruitLine = line(fruitConf.id, fruitConf.qty, fruitConf.unit)
  const lines = [ccLine, fruitLine]
  return toMeal({
    id: `combo-cottage-${fruitConf.id}-${idx}`,
    name: `Cottage Cheese & ${fruitLine.name}`,
    type: 'snack',
    tags: ['dairy', 'vegetarian', 'high-protein', 'quick'],
    lines,
    recipe: `Combine cottage cheese and ${fruitLine.name.toLowerCase()} in a bowl.`,
  })
}

// Builds ~99 procedurally generated meals from the rosters above: 3-4 dinner
// combos per protein (bowl, stir-fry, sheet pan, plus a pasta bake and/or
// wrap for proteins that suit those formats), egg scrambles across the first
// 8 veggies, and oatmeal/yogurt/cottage-cheese snacks across all 6 fruits.
export function generateComboMeals() {
  const meals = []

  PROTEINS.forEach((protein, i) => {
    const carbConf = pick(CARBS, i)
    const carbConf2 = pick(CARBS, i + 3)
    const vegConf = pick(VEGGIES, i)
    const vegConf2 = pick(VEGGIES, i + 5)
    const vegConf3 = pick(VEGGIES, i + 8)
    const wrapVeg = pick(VEGGIES, i + 2)

    meals.push(bowlMeal(protein, carbConf, vegConf, i))
    meals.push(stirFryMeal(protein, carbConf2, vegConf2, i))
    meals.push(sheetPanMeal(protein, vegConf3, i))

    const isMeatOrSeafood = protein.dietTag === 'meat' || protein.dietTag === 'seafood'
    if (isMeatOrSeafood || protein.id === 'tofu-firm' || protein.id === 'tempeh') {
      meals.push(pastaBakeMeal(protein, i))
    }
    if (isMeatOrSeafood || protein.id === 'tofu-firm') {
      meals.push(wrapMeal(protein, wrapVeg, i))
    }
  })

  VEGGIES.slice(0, 8).forEach((vegConf, i) => {
    meals.push(eggScrambleMeal(vegConf, i))
  })

  FRUITS.forEach((fruitConf, i) => {
    meals.push(oatmealMeal(fruitConf, i))
    meals.push(yogurtSnackMeal(fruitConf, i))
    meals.push(cottageCheeseSnackMeal(fruitConf, i))
  })

  return meals
}
