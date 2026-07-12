// Each meal's calories/macros/ingredients are for ONE serving. servingWeightG is
// an approximate total weight of that one plated serving, so it can be used as a
// food-scale target when someone preps multiple portions ahead of time.
// Ingredient qty scales linearly — multiply qty by N to prep N servings.
export const MEALS = [
  // ---- BREAKFAST ----
  {
    id: 'b1', name: 'Greek Yogurt Protein Bowl', type: 'breakfast',
    tags: ['dairy', 'quick', 'vegetarian', 'sweet'],
    calories: 380, protein: 34, carbs: 42, fat: 9, servingWeightG: 380,
    ingredients: [
      { name: 'Plain Greek yogurt', qty: 1, unit: 'cup' },
      { name: 'Granola', qty: 0.33, unit: 'cup' },
      { name: 'Honey', qty: 1, unit: 'tbsp' },
      { name: 'Mixed berries', qty: 0.5, unit: 'cup' },
    ],
    recipe: 'Scoop yogurt into a bowl. Top with granola, berries, and a drizzle of honey. Done in 2 minutes.',
  },
  {
    id: 'b2', name: 'Veggie Egg Scramble', type: 'breakfast',
    tags: ['eggs', 'savory', 'vegetarian', 'low-carb'],
    calories: 340, protein: 26, carbs: 10, fat: 22, servingWeightG: 260,
    ingredients: [
      { name: 'Eggs', qty: 3, unit: 'large' },
      { name: 'Bell pepper', qty: 0.5, unit: '' },
      { name: 'Spinach', qty: 1, unit: 'cup' },
      { name: 'Shredded cheddar', qty: 0.25, unit: 'cup' },
      { name: 'Olive oil', qty: 1, unit: 'tsp' },
    ],
    recipe: 'Sauté diced pepper and spinach in olive oil 2 min. Add whisked eggs, scramble until set. Top with cheese.',
  },
  {
    id: 'b3', name: 'Overnight Oats with Peanut Butter', type: 'breakfast',
    tags: ['oats', 'vegetarian', 'meal-prep', 'sweet'],
    calories: 420, protein: 20, carbs: 55, fat: 14, servingWeightG: 310,
    ingredients: [
      { name: 'Rolled oats', qty: 0.5, unit: 'cup' },
      { name: 'Milk', qty: 0.75, unit: 'cup' },
      { name: 'Peanut butter', qty: 1, unit: 'tbsp' },
      { name: 'Banana', qty: 0.5, unit: '' },
      { name: 'Chia seeds', qty: 1, unit: 'tsp' },
    ],
    recipe: 'Combine oats, milk, and chia in a jar. Refrigerate overnight. Top with peanut butter and sliced banana.',
  },
  {
    id: 'b4', name: 'Turkey Sausage & Toast', type: 'breakfast',
    tags: ['meat', 'savory', 'quick'],
    calories: 400, protein: 28, carbs: 30, fat: 18, servingWeightG: 220,
    ingredients: [
      { name: 'Turkey breakfast sausage links', qty: 3, unit: '' },
      { name: 'Whole wheat bread', qty: 2, unit: 'slices' },
      { name: 'Butter', qty: 1, unit: 'tsp' },
    ],
    recipe: 'Pan-fry sausage links 6-8 min, turning often. Toast bread and butter lightly. Serve together.',
  },
  {
    id: 'b5', name: 'Protein Smoothie', type: 'breakfast',
    tags: ['quick', 'sweet', 'no-cook', 'dairy'],
    calories: 350, protein: 32, carbs: 38, fat: 8, servingWeightG: 420,
    ingredients: [
      { name: 'Whey protein powder', qty: 1, unit: 'scoop' },
      { name: 'Frozen banana', qty: 1, unit: '' },
      { name: 'Milk', qty: 1, unit: 'cup' },
      { name: 'Peanut butter', qty: 1, unit: 'tsp' },
      { name: 'Ice', qty: 1, unit: 'cup' },
    ],
    recipe: 'Blend all ingredients until smooth, about 45 seconds.',
  },
  {
    id: 'b6', name: 'Breakfast Burrito', type: 'breakfast',
    tags: ['eggs', 'savory', 'meal-prep', 'meat'],
    calories: 460, protein: 27, carbs: 40, fat: 20, servingWeightG: 330,
    ingredients: [
      { name: 'Eggs', qty: 2, unit: 'large' },
      { name: 'Flour tortilla', qty: 1, unit: 'large', isWrapper: true },
      { name: 'Breakfast sausage crumbles', qty: 0.25, unit: 'cup' },
      { name: 'Shredded cheese', qty: 0.25, unit: 'cup' },
      { name: 'Salsa', qty: 2, unit: 'tbsp' },
    ],
    recipe: 'Scramble eggs with sausage crumbles. Fill tortilla, add cheese and salsa, roll tightly.',
  },

  // ---- LUNCH ----
  {
    id: 'l1', name: 'Grilled Chicken Rice Bowl', type: 'lunch',
    tags: ['meat', 'meal-prep', 'high-protein'],
    calories: 520, protein: 45, carbs: 55, fat: 12, servingWeightG: 480,
    ingredients: [
      { name: 'Chicken breast', qty: 6, unit: 'oz' },
      { name: 'Jasmine rice (dry)', qty: 0.75, unit: 'cup' },
      { name: 'Broccoli', qty: 1, unit: 'cup' },
      { name: 'Soy sauce', qty: 1, unit: 'tbsp' },
      { name: 'Sesame oil', qty: 1, unit: 'tsp' },
    ],
    recipe: 'Cook rice per package. Grill or pan-sear seasoned chicken 6 min per side. Steam broccoli. Combine, drizzle soy sauce and sesame oil.',
  },
  {
    id: 'l2', name: 'Turkey Club Wrap', type: 'lunch',
    tags: ['meat', 'quick', 'no-cook'],
    calories: 480, protein: 32, carbs: 40, fat: 20, servingWeightG: 340,
    ingredients: [
      { name: 'Whole wheat tortilla', qty: 1, unit: 'large', isWrapper: true },
      { name: 'Deli turkey', qty: 4, unit: 'oz' },
      { name: 'Bacon (cooked)', qty: 2, unit: 'slices' },
      { name: 'Lettuce', qty: 1, unit: 'cup' },
      { name: 'Tomato', qty: 0.5, unit: '' },
      { name: 'Mayo', qty: 1, unit: 'tbsp' },
    ],
    recipe: 'Lay tortilla flat, spread mayo, layer turkey, bacon, lettuce, tomato. Roll tightly and slice in half.',
  },
  {
    id: 'l3', name: 'Black Bean Quesadilla', type: 'lunch',
    tags: ['vegetarian', 'quick', 'savory'],
    calories: 450, protein: 20, carbs: 52, fat: 17, servingWeightG: 330,
    ingredients: [
      { name: 'Black beans (drained)', qty: 0.5, unit: 'cup' },
      { name: 'Flour tortilla', qty: 2, unit: 'medium', isWrapper: true },
      { name: 'Shredded Mexican cheese', qty: 0.5, unit: 'cup' },
      { name: 'Salsa', qty: 2, unit: 'tbsp' },
    ],
    recipe: 'Spread beans and cheese between tortillas. Pan-fry 3 min per side until golden. Serve with salsa.',
  },
  {
    id: 'l4', name: 'Tuna Salad Sandwich', type: 'lunch',
    tags: ['seafood', 'quick', 'no-cook'],
    calories: 420, protein: 30, carbs: 35, fat: 16, servingWeightG: 280,
    ingredients: [
      { name: 'Canned tuna (drained)', qty: 1, unit: 'can' },
      { name: 'Mayo', qty: 2, unit: 'tbsp' },
      { name: 'Celery (diced)', qty: 1, unit: 'stalk' },
      { name: 'Whole wheat bread', qty: 2, unit: 'slices' },
    ],
    recipe: 'Mix tuna, mayo, and celery. Spread on bread, top with second slice.',
  },
  {
    id: 'l5', name: 'Steak & Sweet Potato', type: 'lunch',
    tags: ['meat', 'meal-prep', 'high-protein'],
    calories: 560, protein: 42, carbs: 45, fat: 22, servingWeightG: 480,
    ingredients: [
      { name: 'Sirloin steak', qty: 6, unit: 'oz' },
      { name: 'Sweet potato', qty: 1, unit: 'medium' },
      { name: 'Green beans', qty: 1, unit: 'cup' },
      { name: 'Olive oil', qty: 1, unit: 'tbsp' },
    ],
    recipe: 'Season and sear steak 4 min per side, rest 5 min. Roast sweet potato wedges at 425°F 25 min. Sauté green beans in oil.',
  },
  {
    id: 'l6', name: 'Chickpea & Feta Salad', type: 'lunch',
    tags: ['vegetarian', 'no-cook', 'light'],
    calories: 400, protein: 16, carbs: 38, fat: 20, servingWeightG: 400,
    ingredients: [
      { name: 'Chickpeas (drained)', qty: 1, unit: 'can' },
      { name: 'Feta cheese', qty: 0.33, unit: 'cup' },
      { name: 'Cucumber', qty: 0.5, unit: '' },
      { name: 'Cherry tomatoes', qty: 1, unit: 'cup' },
      { name: 'Olive oil', qty: 1, unit: 'tbsp' },
      { name: 'Lemon', qty: 0.5, unit: '' },
    ],
    recipe: 'Combine chickpeas, feta, cucumber, and tomatoes. Dress with olive oil and lemon juice.',
  },

  // ---- DINNER ----
  {
    id: 'd1', name: 'Baked Salmon & Asparagus', type: 'dinner',
    tags: ['seafood', 'low-carb', 'high-protein'],
    calories: 480, protein: 40, carbs: 12, fat: 30, servingWeightG: 340,
    ingredients: [
      { name: 'Salmon fillet', qty: 6, unit: 'oz' },
      { name: 'Asparagus spears', qty: 8, unit: '' },
      { name: 'Lemon', qty: 1, unit: '' },
      { name: 'Olive oil', qty: 1, unit: 'tbsp' },
      { name: 'Garlic', qty: 2, unit: 'cloves' },
    ],
    recipe: 'Roast salmon and asparagus at 400°F for 15 min with olive oil, garlic, and lemon slices.',
  },
  {
    id: 'd2', name: 'Beef & Broccoli Stir-fry', type: 'dinner',
    tags: ['meat', 'meal-prep', 'savory'],
    calories: 540, protein: 38, carbs: 48, fat: 20, servingWeightG: 460,
    ingredients: [
      { name: 'Flank steak (sliced thin)', qty: 6, unit: 'oz' },
      { name: 'Broccoli', qty: 2, unit: 'cups' },
      { name: 'Jasmine rice (dry)', qty: 0.75, unit: 'cup' },
      { name: 'Soy sauce', qty: 2, unit: 'tbsp' },
      { name: 'Garlic', qty: 2, unit: 'cloves' },
    ],
    recipe: 'Stir-fry beef in a hot pan 2-3 min. Add broccoli and garlic, cook 4 min more. Add soy sauce. Serve over rice.',
  },
  {
    id: 'd3', name: 'Turkey Chili', type: 'dinner',
    tags: ['meat', 'meal-prep', 'high-protein'],
    calories: 460, protein: 38, carbs: 40, fat: 14, servingWeightG: 420,
    ingredients: [
      { name: 'Ground turkey', qty: 4, unit: 'oz' },
      { name: 'Kidney beans', qty: 0.5, unit: 'cup' },
      { name: 'Diced tomatoes', qty: 0.5, unit: 'cup' },
      { name: 'Onion (diced)', qty: 0.25, unit: '' },
      { name: 'Chili powder', qty: 0.75, unit: 'tsp' },
    ],
    recipe: 'Brown turkey with diced onion. Add beans, tomatoes, and chili powder. Simmer 20 min.',
  },
  {
    id: 'd4', name: 'Shrimp Fried Rice', type: 'dinner',
    tags: ['seafood', 'quick', 'savory'],
    calories: 490, protein: 32, carbs: 55, fat: 15, servingWeightG: 400,
    ingredients: [
      { name: 'Shrimp (peeled)', qty: 4, unit: 'oz' },
      { name: 'Cooked rice', qty: 1, unit: 'cup' },
      { name: 'Frozen peas & carrots', qty: 0.5, unit: 'cup' },
      { name: 'Eggs', qty: 1, unit: 'large' },
      { name: 'Soy sauce', qty: 1, unit: 'tbsp' },
    ],
    recipe: 'Scramble egg, set aside. Sauté shrimp 3 min. Add rice, veggies, soy sauce, and egg. Toss until hot.',
  },
  {
    id: 'd5', name: 'Veggie Pasta Primavera', type: 'dinner',
    tags: ['vegetarian', 'savory', 'meal-prep'],
    calories: 500, protein: 18, carbs: 70, fat: 16, servingWeightG: 400,
    ingredients: [
      { name: 'Penne pasta (dry)', qty: 1, unit: 'cup' },
      { name: 'Zucchini', qty: 0.5, unit: '' },
      { name: 'Cherry tomatoes', qty: 0.5, unit: 'cup' },
      { name: 'Parmesan', qty: 2, unit: 'tbsp' },
      { name: 'Olive oil', qty: 1, unit: 'tbsp' },
    ],
    recipe: 'Cook pasta. Sauté zucchini and tomatoes in olive oil 5 min. Toss with pasta and parmesan.',
  },
  {
    id: 'd6', name: 'Grilled Chicken Fajitas', type: 'dinner',
    tags: ['meat', 'savory', 'meal-prep'],
    calories: 520, protein: 40, carbs: 45, fat: 18, servingWeightG: 440,
    ingredients: [
      { name: 'Chicken breast', qty: 6, unit: 'oz' },
      { name: 'Bell pepper', qty: 1, unit: '' },
      { name: 'Onion', qty: 0.5, unit: '' },
      { name: 'Flour tortillas (small)', qty: 3, unit: '', isWrapper: true },
      { name: 'Fajita seasoning', qty: 0.5, unit: 'packet' },
    ],
    recipe: 'Slice chicken and veggies, toss with seasoning. Sauté 8-10 min until chicken is cooked through. Serve in tortillas.',
  },

  // ---- SNACKS ----
  {
    id: 's1', name: 'Apple & Peanut Butter', type: 'snack',
    tags: ['quick', 'no-cook', 'vegetarian', 'sweet'],
    calories: 220, protein: 7, carbs: 25, fat: 12, servingWeightG: 210,
    ingredients: [
      { name: 'Apple', qty: 1, unit: 'medium' },
      { name: 'Peanut butter', qty: 2, unit: 'tbsp' },
    ],
    recipe: 'Slice apple, serve with peanut butter for dipping.',
  },
  {
    id: 's2', name: 'Cottage Cheese & Pineapple', type: 'snack',
    tags: ['dairy', 'quick', 'sweet', 'high-protein'],
    calories: 180, protein: 20, carbs: 16, fat: 4, servingWeightG: 280,
    ingredients: [
      { name: 'Cottage cheese', qty: 1, unit: 'cup' },
      { name: 'Pineapple chunks', qty: 0.5, unit: 'cup' },
    ],
    recipe: 'Combine in a bowl, eat cold.',
  },
  {
    id: 's3', name: 'Trail Mix', type: 'snack',
    tags: ['no-cook', 'quick', 'vegetarian'],
    calories: 260, protein: 8, carbs: 22, fat: 17, servingWeightG: 70,
    ingredients: [
      { name: 'Mixed nuts', qty: 0.25, unit: 'cup' },
      { name: 'Raisins', qty: 2, unit: 'tbsp' },
      { name: 'Dark chocolate chips', qty: 1, unit: 'tbsp' },
    ],
    recipe: 'Mix all ingredients in a small container.',
  },
  {
    id: 's4', name: 'Protein Bar', type: 'snack',
    tags: ['quick', 'meal-prep', 'sweet'],
    calories: 210, protein: 20, carbs: 22, fat: 7, servingWeightG: 60,
    ingredients: [
      { name: 'Protein bar', qty: 1, unit: '' },
    ],
    recipe: 'Unwrap and eat — great for on-the-go.',
  },
  {
    id: 's5', name: 'Hard-Boiled Eggs', type: 'snack',
    tags: ['eggs', 'meal-prep', 'high-protein', 'low-carb'],
    calories: 140, protein: 12, carbs: 1, fat: 10, servingWeightG: 100,
    ingredients: [
      { name: 'Eggs', qty: 2, unit: 'large' },
    ],
    recipe: 'Boil eggs 10-12 min, cool in ice water, peel. Make a batch for the week.',
  },
  {
    id: 's6', name: 'Veggies & Hummus', type: 'snack',
    tags: ['vegetarian', 'no-cook', 'light'],
    calories: 170, protein: 6, carbs: 18, fat: 9, servingWeightG: 220,
    ingredients: [
      { name: 'Baby carrots', qty: 1, unit: 'cup' },
      { name: 'Hummus', qty: 0.25, unit: 'cup' },
    ],
    recipe: 'Dip carrots in hummus. Add celery or bell pepper strips for variety.',
  },
]

export const ALL_TAGS = [...new Set(MEALS.flatMap(m => m.tags))].sort()
