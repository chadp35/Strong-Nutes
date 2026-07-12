import { supabase } from './supabaseClient.js'

export const defaultState = {
  profile: null,       // { sex, weightKg, heightCm, age, activityKey, goalKey, likedTags, dislikedTags, targets, goalPlan }
  log: {},              // { 'YYYY-MM-DD': [{ id, name, calories, protein, carbs, fat }] }
  plan: null,            // array from generatePlan
  shoppingChecked: {},   // { 'itemName|unit': true }
  pantry: [],            // saved pantry item strings, so users don't retype their staples
  customFoods: [],        // [{ id, name, brand, calories, protein, carbs, fat, servingLabel }]
  bodyMetrics: [],         // [{ id, date, weightLbs, waist, quads, calves, bust, hips, notes }]
  water: {},                // { 'YYYY-MM-DD': cupsCount }
}

// Loads the signed-in user's saved state from Supabase. Returns defaults if
// they're brand new (no row yet) or if the request fails.
export async function loadState(userId) {
  const { data, error } = await supabase
    .from('app_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load state', error)
    return { ...defaultState }
  }
  if (!data) return { ...defaultState }

  return {
    profile: data.profile ?? null,
    log: data.log ?? {},
    plan: data.plan ?? null,
    shoppingChecked: data.shopping_checked ?? {},
    pantry: data.pantry ?? [],
    customFoods: data.custom_foods ?? [],
    bodyMetrics: data.body_metrics ?? [],
    water: data.water ?? {},
  }
}

// Upserts the full state blob for the signed-in user. userEmail is stored
// alongside so a coach viewing this row (via the coach RLS policy) has a way
// to identify who it belongs to — coaches can't otherwise query auth.users.
export async function saveState(userId, state, userEmail) {
  const { error } = await supabase.from('app_state').upsert({
    user_id: userId,
    profile: state.profile,
    log: state.log,
    plan: state.plan,
    shopping_checked: state.shoppingChecked,
    pantry: state.pantry,
    custom_foods: state.customFoods,
    body_metrics: state.bodyMetrics,
    water: state.water,
    contact_email: userEmail,
  })
  if (error) console.error('Failed to save state', error)
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}
