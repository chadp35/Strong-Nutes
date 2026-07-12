// A local safety net, not a replacement for Supabase. Supabase (Postgres)
// stays the source of truth; this just makes sure a network blip never wipes
// what's on screen or silently drops an edit.
const CACHE_PREFIX = 'strongnutes-cache-'
const PENDING_PREFIX = 'strongnutes-pending-'

export function getCachedState(userId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedState(userId, state) {
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to cache state locally', e)
  }
}

// A "pending" save is a set of edits that couldn't reach Supabase — kept
// separately from the read cache so we know to prioritize it over whatever's
// on the server (which is now stale relative to these unsynced local edits).
export function getPendingSave(userId) {
  try {
    const raw = localStorage.getItem(PENDING_PREFIX + userId)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPendingSave(userId, state) {
  try {
    localStorage.setItem(PENDING_PREFIX + userId, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to queue pending save locally', e)
  }
}

export function clearPendingSave(userId) {
  try {
    localStorage.removeItem(PENDING_PREFIX + userId)
  } catch {
    // Non-fatal — worst case we retry clearing it next successful save.
  }
}
