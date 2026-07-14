import { supabase } from './supabaseClient.js'

// Calls the analyze-food edge function with the user's own provider + key
// (see supabase/functions/analyze-food/index.ts — it's stateless and never
// stores the key, just forwards this one request to whichever provider).
export async function analyzeFood({ provider, apiKey, description, imageBase64 }) {
  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { provider, apiKey, description, imageBase64 },
  })

  if (error) {
    let message = error.message || 'The scan failed — try again.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // context wasn't JSON (network-level failure, CORS, etc.) — fall back
      // to the generic message above rather than throwing a second error.
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data // { items: [{ name, grams, calories, protein, carbs, fat }] }
}

// Reads a File (from an <input type="file"> photo) into the raw base64
// string the edge function expects — strips the "data:image/...;base64,"
// prefix that FileReader includes.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = () => reject(new Error("Couldn't read that image — try picking it again."))
    reader.readAsDataURL(file)
  })
}
