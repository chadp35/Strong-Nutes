// Mifflin-St Jeor equation — the modern standard, more accurate than Harris-Benedict
export function calculateBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export const ACTIVITY_MULTIPLIERS = {
  sedentary: { label: 'Sedentary (desk job, little exercise)', value: 1.2 },
  light: { label: 'Lightly active (1-3 workouts/week)', value: 1.375 },
  moderate: { label: 'Moderately active (3-5 workouts/week)', value: 1.55 },
  active: { label: 'Very active (6-7 workouts/week)', value: 1.725 },
  athlete: { label: 'Athlete (2x/day training)', value: 1.9 },
}

export function calculateTDEE(bmr, activityKey) {
  return bmr * ACTIVITY_MULTIPLIERS[activityKey].value
}

// Goal adjustments as a fraction of TDEE
export const GOALS = {
  lose: { label: 'Lose fat', calorieAdjust: -0.20, proteinPerKg: 2.0 },
  maintain: { label: 'Maintain', calorieAdjust: 0, proteinPerKg: 1.6 },
  gain: { label: 'Build muscle', calorieAdjust: 0.12, proteinPerKg: 1.8 },
}

// Returns { calories, protein, carbs, fat } in grams (calories in kcal)
export function calculateTargets({ sex, weightKg, heightCm, age, activityKey, goalKey }) {
  const bmr = calculateBMR({ sex, weightKg, heightCm, age })
  const tdee = calculateTDEE(bmr, activityKey)
  const goal = GOALS[goalKey]
  const calories = Math.round(tdee * (1 + goal.calorieAdjust))

  const protein = Math.round(goal.proteinPerKg * weightKg)
  const proteinCals = protein * 4

  const fatCals = calories * 0.28 // fat fixed near ~28% of total, rest goes to carbs
  const fat = Math.round(fatCals / 9)

  const remainingCals = Math.max(calories - proteinCals - fatCals, 0)
  const carbs = Math.round(remainingCals / 4)

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat }
}

export function lbsToKg(lbs) {
  return lbs * 0.453592
}
export function kgToLbs(kg) {
  return kg / 0.453592
}
export function ftInToCm(ft, inches) {
  return (ft * 12 + inches) * 2.54
}
