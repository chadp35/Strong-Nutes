// AI food scanner proxy. Stateless — every request carries its OWN provider
// and API key (the caller's own, "bring your own key"), so this function
// never stores or embeds a secret and works identically for any number of
// users with any number of different providers/keys at once. All it does is
// translate one common request shape into whichever provider's API expects,
// and normalize whatever comes back into one common response shape:
//   { items: [{ name, grams, calories, protein, carbs, fat }] }
//
// Deploy: Supabase Dashboard > Edge Functions > deploy this file as
// "analyze-food" (or `supabase functions deploy analyze-food` with the CLI).
// No secrets/env vars needed for this function itself.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INSTRUCTIONS = `You are a nutrition estimation assistant for a calorie-tracking app. Given a photo of a meal and/or a text description of one, identify each distinct food item, estimate its portion size in grams, and estimate calories, protein (g), carbs (g), and fat (g) for that specific portion.

Be a careful, realistic estimator: use typical home-cooking or restaurant portion sizes as a guide, and account for visible oil, butter, sauce, or dressing rather than ignoring it. Break combined dishes into their meaningful components when it helps accuracy (e.g. "grilled chicken", "white rice", "steamed broccoli" rather than one vague line), but don't over-fragment single simple items.

Respond with ONLY valid JSON, no markdown formatting, no other text, in exactly this shape:
{"items":[{"name":"string","grams":number,"calories":number,"protein":number,"carbs":number,"fat":number}]}

If you can't identify any food at all, respond with {"items":[]}.`

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Providers occasionally wrap their JSON in a code fence or add stray text
// even when asked not to — this pulls out the first {...} block rather than
// failing outright on a strict JSON.parse of the whole string.
function extractJSON(text: string): { items: unknown[] } {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '')
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    throw new Error("Couldn't parse a food list out of the AI's response.")
  }
}

function normalizeItems(raw: unknown): { items: any[] } {
  const items = (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) ? (raw as any).items : []
  return {
    items: items
      .filter((i: any) => i && typeof i === 'object' && i.name)
      .map((i: any) => ({
        name: String(i.name).slice(0, 120),
        grams: Math.max(0, Math.round(Number(i.grams) || 0)),
        calories: Math.max(0, Math.round(Number(i.calories) || 0)),
        protein: Math.max(0, Math.round((Number(i.protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((Number(i.carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((Number(i.fat) || 0) * 10) / 10),
      })),
  }
}

async function callOpenAI(apiKey: string, prompt: string, imageBase64?: string) {
  const content: any[] = [{ type: 'text', text: prompt }]
  if (imageBase64) content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      messages: [
        { role: 'system', content: INSTRUCTIONS },
        { role: 'user', content },
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI error (${res.status})`)
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('OpenAI returned an empty response.')
  return extractJSON(text)
}

async function callAnthropic(apiKey: string, prompt: string, imageBase64?: string) {
  const content: any[] = [{ type: 'text', text: prompt }]
  if (imageBase64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } })

  const schema = {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            grams: { type: 'number' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
          },
          required: ['name', 'grams', 'calories', 'protein', 'carbs', 'fat'],
        },
      },
    },
    required: ['items'],
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      system: INSTRUCTIONS,
      messages: [{ role: 'user', content }],
      tools: [{ name: 'log_foods', description: 'Return the identified foods and their estimated nutrition.', input_schema: schema }],
      tool_choice: { type: 'tool', name: 'log_foods' },
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic error (${res.status})`)
  const toolUse = (data.content || []).find((b: any) => b.type === 'tool_use')
  if (!toolUse?.input) throw new Error('Anthropic returned an empty response.')
  return toolUse.input
}

async function callGemini(apiKey: string, prompt: string, imageBase64?: string) {
  const parts: any[] = [{ text: prompt }]
  if (imageBase64) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Gemini error (${res.status})`)
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned an empty response.')
  return extractJSON(text)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const { provider, apiKey, description, imageBase64 } = body || {}
  if (!provider || !apiKey) return jsonResponse({ error: 'Missing provider or API key.' }, 400)
  if (!description && !imageBase64) return jsonResponse({ error: 'Provide a photo or a description.' }, 400)

  const prompt = description
    ? `Meal description: "${description}"`
    : 'Identify the food in this photo.'

  try {
    let raw
    if (provider === 'openai') raw = await callOpenAI(apiKey, prompt, imageBase64)
    else if (provider === 'anthropic') raw = await callAnthropic(apiKey, prompt, imageBase64)
    else if (provider === 'gemini') raw = await callGemini(apiKey, prompt, imageBase64)
    else return jsonResponse({ error: `Unknown provider "${provider}".` }, 400)

    return jsonResponse(normalizeItems(raw))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'The AI request failed.'
    return jsonResponse({ error: message }, 502)
  }
})
