import { supabase } from './supabaseClient.js'
import { getCachedState, setCachedState, getPendingSave, setPendingSave, clearPendingSave } from './localCache.js'
import { localDateKey } from './dateKey.js'

export const defaultState = {
  profile: null,       // { sex, weightKg, heightCm, age, activityKey, goalKey, likedTags, dislikedTags, targets, goalPlan, coachId, allergies, dietaryFramework, eatingStyle, likedIngredients, dislikedIngredients, leftoverTolerance, cookingComplexity, convenienceLevel, lunchTemperature, beverageNotes, nonNegotiable }
  log: {},              // { 'YYYY-MM-DD': [{ id, name, calories, protein, carbs, fat }] }
  plan: null,            // array from generatePlan
  shoppingChecked: {},   // { 'itemName|unit': true }
  pantry: [],            // saved pantry item strings, so users don't retype their staples
  customFoods: [],        // [{ id, name, brand, calories, protein, carbs, fat, servingLabel }]
  bodyMetrics: [],         // [{ id, date, weightLbs, waist, quads, calves, bust, hips, notes }]
  water: {},                // { 'YYYY-MM-DD': cupsCount }
  customRecipes: [],         // [{ id, name, type, tags, calories, protein, carbs, fat, servingWeightG, ingredients, recipe, isCustomRecipe, builderState }]
  discoveredProducts: [],     // [{ id, name, brand, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, servingGrams, servingLabel }] — grows every time a barcode scan or web search result actually gets used
  aiConfig: null,              // { provider, apiKey } — ONLY present here (and synced to Supabase) if the person explicitly opted into cross-device sync in the AI scanner setup; device-only by default (see lib/aiConfig.js)
}

function normalizeRow(data) {
  return {
    profile: data.profile ?? null,
    log: data.log ?? {},
    plan: data.plan ?? null,
    shoppingChecked: data.shopping_checked ?? {},
    pantry: data.pantry ?? [],
    customFoods: data.custom_foods ?? [],
    bodyMetrics: data.body_metrics ?? [],
    water: data.water ?? {},
    customRecipes: data.custom_recipes ?? [],
    discoveredProducts: data.discovered_products ?? [],
    aiConfig: data.ai_config ?? null,
  }
}

// Loads the signed-in user's data. Returns { state, source } where source is
// one of:
//   'server'  — fresh from Supabase, the normal case
//   'pending' — local edits that never made it to the server on a previous
//               session; these take priority over whatever's on the server,
//               since the server is now stale relative to them
//   'cache'   — Supabase couldn't be reached at all; showing the last known
//               good state instead of blanking the app
//   'default' — brand new user, or truly nothing to fall back to
export async function loadState(userId) {
  try {
    const { data, error } = await supabase.from('app_state').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error

    const pending = getPendingSave(userId)
    if (pending) {
      return { state: pending, source: 'pending' }
    }

    if (!data) {
      const fresh = { ...defaultState }
      setCachedState(userId, fresh)
      return { state: fresh, source: 'server' }
    }

    const loaded = normalizeRow(data)
    setCachedState(userId, loaded)
    return { state: loaded, source: 'server' }
  } catch (error) {
    console.error('Failed to load state from Supabase, falling back to local cache', error)
    const cached = getCachedState(userId)
    if (cached) return { state: cached, source: 'cache' }
    return { state: { ...defaultState }, source: 'default' }
  }
}

async function attemptSave(userId, state, userEmail) {
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
    custom_recipes: state.customRecipes,
    discovered_products: state.discoveredProducts,
    ai_config: state.aiConfig ?? null,
    contact_email: userEmail,
  })
  if (error) throw error
}

// Saves with a couple of quick retries before giving up. On success, clears
// any previously-queued pending save. On final failure, queues this save
// locally so it isn't lost — App.jsx retries it automatically once the
// browser reports it's back online. Always refreshes the local read-cache
// regardless of outcome, so a later offline reload has something recent.
export async function saveState(userId, state, userEmail) {
  setCachedState(userId, state)

  const retryDelaysMs = [0, 1200, 3500]
  for (let i = 0; i < retryDelaysMs.length; i++) {
    if (retryDelaysMs[i] > 0) await new Promise(r => setTimeout(r, retryDelaysMs[i]))
    try {
      await attemptSave(userId, state, userEmail)
      clearPendingSave(userId)
      return { synced: true }
    } catch (error) {
      if (i === retryDelaysMs.length - 1) {
        console.error('Failed to save after retries — queued locally, will retry when back online', error)
        setPendingSave(userId, state)
        return { synced: false }
      }
    }
  }
  return { synced: false }
}

export function todayKey() {
  return localDateKey()
}
