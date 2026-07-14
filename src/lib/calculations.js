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

// Estimated body fat band, collected once in onboarding. Leaner people carry
// less spare energy/protein reserve, so they need relatively more protein
// per kg to hold onto muscle during a cut, and a slower pace is safer for
// them; someone with more to lose can safely move a bit faster. Not a
// diagnosis — a self-reported band used only to nudge these two numbers.
export const BODY_FAT_BANDS = {
  under15: { label: 'Less than 15%', proteinBonusPerKg: 0.3, paceCapPctPerWeek: 0.0075 },
  '15to22': { label: '15–22%', proteinBonusPerKg: 0.15, paceCapPctPerWeek: 0.01 },
  '22to30': { label: '22–30%', proteinBonusPerKg: 0, paceCapPctPerWeek: 0.0125 },
  over30: { label: 'Greater than 30%', proteinBonusPerKg: 0, paceCapPctPerWeek: 0.015 },
  notSure: { label: "Not sure", proteinBonusPerKg: 0, paceCapPctPerWeek: 0.01 },
}

// Self-rated track record with past diets — used only to pick a sensible
// default pace (not to gatekeep anything; someone can always choose a
// faster or slower option themselves).
export const DIETING_CONFIDENCE = {
  low: { label: 'Not very confident', blurb: "Never successfully dieted, not sure what worked" },
  moderate: { label: 'Moderately confident', blurb: "Gotten results before but hasn't stuck long-term" },
  high: { label: 'Extremely confident', blurb: 'Successfully dieted before and kept results off' },
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

// Returns { calories, protein, carbs, fat } in grams (calories in kcal).
// bodyFatBand is optional — when given, its protein bonus stacks with the
// goal's and eating style's, same as everywhere else this math is used.
export function calculateTargets({ sex, weightKg, heightCm, age, activityKey, goalKey, eatingStyle = 'balanced', bodyFatBand }) {
  const bmr = calculateBMR({ sex, weightKg, heightCm, age })
  const tdee = calculateTDEE(bmr, activityKey)
  const goal = GOALS[goalKey]
  const style = EATING_STYLES[eatingStyle] || EATING_STYLES.balanced
  const bodyFatBonus = BODY_FAT_BANDS[bodyFatBand]?.proteinBonusPerKg || 0
  const calories = Math.round(tdee * (1 + goal.calorieAdjust))
  const { protein, carbs, fat } = macroSplitForCalories(calories, weightKg, goal.proteinPerKg + style.proteinBonusPerKg + bodyFatBonus, style.fatPct)
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), calories, protein, carbs, fat }
}

// Picks a sensible default goal-plan tier ('gradual' or 'moderate' — never
// auto-recommends 'aggressive', that stays a manual/Custom choice only) from
// the onboarding context, plus an optional heads-up note to show alongside
// it. Being on a weight-loss medication or having low past-diet confidence
// both push toward the gentler default; this never blocks picking a faster
// pace manually, it just changes what's pre-selected and starred.
export function recommendGoalPlanApproach({ confidenceKey, weightLossDrugUse, bodyFatBand }) {
  const notes = []
  let recommendedTierKey = 'moderate'

  if (weightLossDrugUse === 'yes') {
    recommendedTierKey = 'gradual'
    notes.push("Since you're on a weight-loss medication, we're starting gentle and leaning on protein rather than stacking a big extra deficit on top of appetite suppression — talk to your prescriber about your nutrition plan.")
  }
  if (confidenceKey === 'low') {
    recommendedTierKey = 'gradual'
    notes.push("Starting gradual tends to be more sustainable if past diets haven't stuck — it's easier to speed up later than to recover from burning out early.")
  }
  if (bodyFatBand === 'under15') {
    recommendedTierKey = 'gradual'
    notes.push("At your leaner body fat range, a slower pace protects muscle better — there's less spare energy to pull from.")
  }

  return { recommendedTierKey, note: notes[0] || null }
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
export function buildGoalPlanTargets({ type, targetChangeLbs, weeks, bmr, tdee, weightKg, weightLbs, bodyFatBand }) {
  const days = Math.max(weeks, 1) * 7
  const totalCalorieChange = targetChangeLbs * KCAL_PER_LB
  const dailyChangeMagnitude = Math.round(totalCalorieChange / days)
  const dailyCalorieChange = type === 'lose' ? -dailyChangeMagnitude : dailyChangeMagnitude

  // Hard floor so the math never recommends something unsafe regardless of input
  const calories = Math.max(Math.round(tdee + dailyCalorieChange), 1200)
  const bodyFatBonus = BODY_FAT_BANDS[bodyFatBand]?.proteinBonusPerKg || 0
  const proteinPerKg = (type === 'lose' ? 2.0 : 1.8) + bodyFatBonus
  const { protein, carbs, fat } = macroSplitForCalories(calories, weightKg, proteinPerKg)

  const wiggleRoom = Math.min(Math.max(Math.round(dailyChangeMagnitude * 0.25), 75), 250)

  const weeklyRateLbs = (dailyChangeMagnitude * 7) / KCAL_PER_LB
  const weeklyRatePct = (weeklyRateLbs / weightLbs) * 100
  // Leaner bodies have a lower safe ceiling — use whichever threshold is
  // more conservative between the generic one and the band's cap.
  const paceCapPct = type === 'lose' && BODY_FAT_BANDS[bodyFatBand]
    ? BODY_FAT_BANDS[bodyFatBand].paceCapPctPerWeek * 100
    : null
  const genericCapPct = type === 'lose' ? 1 : 0.6
  const isAggressive = weeklyRatePct > (paceCapPct != null ? Math.min(paceCapPct, genericCapPct) : genericCapPct)

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
