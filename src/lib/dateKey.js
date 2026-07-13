// The one place "what calendar day is it right now, for this person" gets
// computed. Deliberately NOT `date.toISOString().slice(0, 10)` — toISOString
// converts to UTC first, which flips to tomorrow's date hours before local
// midnight for anyone west of the prime meridian (e.g. ~8pm in US Eastern,
// ~5pm in US Pacific). That mismatch meant meals logged in the evening could
// silently get attributed to the wrong day's totals — exactly the kind of
// bug that makes someone's calorie count look wrong for no visible reason.
// Every log entry, water count, weigh-in, and meal-plan day date should key
// off this (or a value derived from it), never a raw toISOString() slice.
export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
