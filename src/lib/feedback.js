import { supabase } from './supabaseClient.js'

// Any signed-in user can insert; RLS restricts reading/updating to the app
// owner only (see supabase/schema.sql). Requires the `feedback` table —
// run the "Beta feedback / bug reports" section of schema.sql once in the
// Supabase SQL editor if you haven't already.
export async function submitFeedback({ userId, userEmail, type, message, page }) {
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    user_email: userEmail,
    type,
    message,
    page,
  })
  if (error) console.error('Failed to submit feedback', error)
  return !error
}

export async function fetchAllFeedback() {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('Failed to load feedback', error)
    return []
  }
  return data || []
}

export async function updateFeedbackStatus(id, status) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
  if (error) console.error('Failed to update feedback status', error)
  return !error
}
