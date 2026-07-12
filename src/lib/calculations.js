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

// Eating-style preference shifts the fat/carb split (protein stays governed
// by the goal above, since that's driven by bodyweight and training goal,
// not eating style). Low-carb tilts toward fat; high-protein pushes protein
// up further and trims fat slightly to make room; balanced is the default.
export const EATING_STYLES = {
  balanced: { label: 'Balanced / Mediterranean', fatPct: 0.28, proteinBonusPerKg: 0 },
  lowcarb: { label: 'Low-carb / plant-forward low-carb', fatPct: 0.40, proteinBonusPerKg: 0 },
  highprotein: { label: 'High-protein / muscle building focus', fatPct: 0.25, proteinBonusPerKg: 0.3 },
  none: { label: 'No preference — design what fits my goals', fatPct: 0.28, proteinBonusPerKg: 0 },
}

// Splits a calorie total into protein/carbs/fat grams. Protein is set by
// bodyweight (higher for a cut to protect muscle, plus an eating-style
// bonus), fat set by eating style, carbs fill whatever's left. Shared by the
// flat-percentage goal calculator and the timed goal-plan calculator so both
// produce consistent macro splits.
function macroSplitForCalories(calories, weightKg, proteinPerKg, fatPct = 0.28) {
  const protein = Math.round(proteinPerKg * weightKg)
  const proteinCals = protein * 4
  const fatCals = calories * fatPct
  const fat = Math.round(fatCals / 9)
  const remainingCals = Math.max(calories - proteinCals - fatCals, 0)
  const carbs = Math.round(remainingCals / 4)
  return { protein, carbs, fat }
}

// Returns { calories, protein, carbs, fat } in grams (calories in kcal)
export function calculateTargets({ sex, weightKg, heightCm, age, activityKey, goalKey, eatingStyle = 'balanced' }) {
  const bmr = calculateBMR({ sex, weightKg, heightCm, age })
  const tdee = calculateTDEE(bmr, activityKey)
  const goal = GOALS[goalKey]
  const style = EATING_STYLES[eatingStyle] || EATING_STYLES.balanced
  const calories = Math.round(tdee * (1 + goal.calorieAdjust))
  const { protein, carbs, fat } = macroSplitForCalories(calories, weightKg, goal.proteinPerKg + style.proteinBonusPerKg, style.fatPct)
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat }
}

// ---------- Timed goal plans (lose/gain N lbs in N weeks) ----------

// The classic ~3500 kcal ≈ 1 lb of fat approximation. It's a simplification
// (individual metabolic adaptation varies) but it's the standard starting
// point this kind of calculator is built on, RP Strength included.
const KCAL_PER_LB = 3500

// Three timeframes per direction, ordered easiest-to-sustain first. Rates are
// % of bodyweight lost/gained per week — the standard way trainers reason
// about pace. Loss can safely run faster than gain, since lean gain is capped
// by how fast muscle can actually be built before the surplus turns to fat.
export const GOAL_TIMEFRAME_TIERS = {
  lose: [
    { key: 'gradual', label: 'Gradual', pctPerWeek: 0.005, blurb: 'Easiest to stick to, minimal muscle loss risk' },
    { key: 'moderate', label: 'Moderate', pctPerWeek: 0.0075, blurb: 'A solid default for most people' },
    { key: 'aggressive', label: 'Aggressive', pctPerWeek: 0.01, blurb: 'Fastest, but harder to sustain and more muscle-loss risk' },
  ],
  gain: [
    { key: 'gradual', label: 'Gradual', pctPerWeek: 0.0015, blurb: 'Slowest, leanest gains' },
    { key: 'moderate', label: 'Moderate', pctPerWeek: 0.0025, blurb: 'A solid default for most people' },
    { key: 'aggressive', label: 'Aggressive', pctPerWeek: 0.005, blurb: 'Fastest, but more of the gain will be fat' },
  ],
}

// Given a goal direction and how much weight to change, returns 3 candidate
// timeframes (in weeks) ranked easiest-to-hardest, for the person to pick from.
export function suggestGoalTimeframes({ type, targetChangeLbs, weightLbs }) {
  const tiers = GOAL_TIMEFRAME_TIERS[type]
  return tiers.map(t => {
    const weeklyLbs = weightLbs * t.pctPerWeek
    const weeks = Math.max(1, Math.round(targetChangeLbs / weeklyLbs))
    return { ...t, weeks, weeklyLbs: Math.round(weeklyLbs * 100) / 100 }
  })
}

// Builds the actual daily calorie/macro targets for a chosen (or custom) goal
// timeframe. Includes a "wiggle room" buffer — since what actually matters is
// the weekly average, not hitting one exact number every single day — and
// flags whether the resulting pace is more aggressive than generally advised.
export function buildGoalPlanTargets({ type, targetChangeLbs, weeks, bmr, tdee, weightKg, weightLbs }) {
  const days = Math.max(weeks, 1) * 7
  const totalCalorieChange = targetChangeLbs * KCAL_PER_LB
  const dailyChangeMagnitude = Math.round(totalCalorieChange / days)
  const dailyCalorieChange = type === 'lose' ? -dailyChangeMagnitude : dailyChangeMagnitude

  // Hard floor so the math never recommends something unsafe regardless of input
  const calories = Math.max(Math.round(tdee + dailyCalorieChange), 1200)
  const proteinPerKg = type === 'lose' ? 2.0 : 1.8
  const { protein, carbs, fat } = macroSplitForCalories(calories, weightKg, proteinPerKg)

  const wiggleRoom = Math.min(Math.max(Math.round(dailyChangeMagnitude * 0.25), 75), 250)

  const weeklyRateLbs = (dailyChangeMagnitude * 7) / KCAL_PER_LB
  const weeklyRatePct = (weeklyRateLbs / weightLbs) * 100
  const isAggressive = type === 'lose' ? weeklyRatePct > 1 : weeklyRatePct > 0.6

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    protein,
    carbs,
    fat,
    dailyCalorieChange,
    wiggleRoom,
    weeklyRateLbs: Math.round(weeklyRateLbs * 100) / 100,
    isAggressive,
  }
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
