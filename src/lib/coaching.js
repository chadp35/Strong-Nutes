import { supabase } from './supabaseClient.js'

// Anyone signed in can read this list (RLS allows it) — used to populate the
// "choose your coach" picker in Settings.
export async function listCoaches() {
  const { data, error } = await supabase.from('coaches').select('user_id, display_name')
  if (error) {
    console.error('Failed to load coaches', error)
    return []
  }
  return data || []
}

// Checks whether the current user is themself a coach.
export async function amICoach(userId) {
  const { data, error } = await supabase.from('coaches').select('user_id, display_name').eq('user_id', userId).maybeSingle()
  if (error) {
    console.error('Failed to check coach status', error)
    return null
  }
  return data
}

// Fetches every client row assigned to this coach. RLS on app_state already
// restricts what comes back to rows where profile.coachId = this coach's id
// (plus the coach's own row, which we filter out here).
export async function fetchMyClients(coachUserId) {
  const { data, error } = await supabase.from('app_state').select('*')
  if (error) {
    console.error('Failed to load clients', error)
    return []
  }
  return (data || []).filter(row => row.user_id !== coachUserId)
}

export async function fetchComments(clientId) {
  const { data, error } = await supabase
    .from('coach_comments')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Failed to load comments', error)
    return []
  }
  return data || []
}

export async function postComment({ clientId, authorId, message, targetType = 'general', targetId = null }) {
  const { error } = await supabase.from('coach_comments').insert({
    client_id: clientId, author_id: authorId, message, target_type: targetType, target_id: targetId,
  })
  if (error) console.error('Failed to post comment', error)
  return !error
}

export async function fetchReactions(clientId) {
  const { data, error } = await supabase.from('coach_reactions').select('*').eq('client_id', clientId)
  if (error) {
    console.error('Failed to load reactions', error)
    return []
  }
  return data || []
}

// Toggles a reaction: adds it if this author hasn't reacted to this target
// yet, removes it if they have (tap-to-like, tap-again-to-unlike).
export async function toggleReaction({ clientId, authorId, targetType, targetId, emoji = '💪' }) {
  const { data: existing } = await supabase
    .from('coach_reactions')
    .select('id')
    .eq('client_id', clientId)
    .eq('author_id', authorId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()

  if (existing) {
    await supabase.from('coach_reactions').delete().eq('id', existing.id)
    return false
  }
  await supabase.from('coach_reactions').insert({ client_id: clientId, author_id: authorId, target_type: targetType, target_id: targetId, emoji })
  return true
}
