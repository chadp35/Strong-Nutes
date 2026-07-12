import { supabase } from './supabaseClient.js'

export const defaultState = {
  profile: null,     // { sex, weightKg, heightCm, age, activityKey, goalKey, likedTags, dislikedTags, targets }
  log: {},            // { 'YYYY-MM-DD': [{ id, name, calories, protein, carbs, fat }] }
  plan: null,          // array from generatePlan
  shoppingChecked: {}, // { 'itemName|unit': true }
  pantry: [],          // saved pantry item strings, so users don't retype their staples
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
  }
}

// Upserts the full state blob for the signed-in user.
export async function saveState(userId, state) {
  const { error } = await supabase.from('app_state').upsert({
    user_id: userId,
    profile: state.profile,
    log: state.log,
    plan: state.plan,
    shopping_checked: state.shoppingChecked,
    pantry: state.pantry,
  })
  if (error) console.error('Failed to save state', error)
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}
