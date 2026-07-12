import React, { useState } from 'react'
import { matchPantryToMeals, scaleMealIngredients, totalBatchWeight, formatIngredient } from '../lib/mealPlanner.js'

const TYPE_OPTIONS = [
  { key: 'any', label: 'Any meal' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

export default function PantryTab({ savedPantry, onSavePantry, onLogMeal, remainingTargets }) {
  const [pantryText, setPantryText] = useState(savedPantry.join('\n'))
  const [type, setType] = useState('any')
  const [results, setResults] = useState(null)
  const [servingsById, setServingsById] = useState({})

  function handleFind() {
    const items = pantryText.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    onSavePantry(items)
    setResults(matchPantryToMeals(pantryText, { type }))
  }

  function servingsFor(id) {
    return servingsById[id] || 1
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>What's in your kitchen?</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        List what you've got — one item per line or comma-separated — and I'll find meals built for your macros that use it.
      </p>

      <div className="card">
        <div className="field">
          <label>Pantry / fridge items</label>
          <textarea
            value={pantryText}
            onChange={e => setPantryText(e.target.value)}
            placeholder={'chicken breast\nrice\nbroccoli\neggs\ngreek yogurt'}
            rows={5}
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '11px 12px', borderRadius: 10, fontSize: 15,
              fontFamily: 'Inter', resize: 'vertical',
            }}
          />
        </div>
        <div className="field">
          <label>Filter by meal type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <button className="primary" onClick={handleFind}>Find meals I can make</button>
      </div>

      {results && results.length === 0 && (
        <div className="empty-state">
          <h3>No matches</h3>
          <p className="small">Try adding a few more staples — even "rice" or "eggs" unlocks several meals.</p>
        </div>
      )}

      {results && results.map(({ meal, matched, missing, matchPct }) => {
        const servings = servingsFor(meal.id)
        const scaled = scaleMealIngredients(meal, servings)
        return (
          <div className="card" key={meal.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <h2 style={{ marginBottom: 0, fontSize: 16, color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>{meal.name}</h2>
              <span className="mono small" style={{ color: matchPct === 1 ? 'var(--fuel)' : 'var(--muted)' }}>
                {matched.length}/{meal.ingredients.length} on hand
              </span>
            </div>
            <p className="meal-type" style={{ marginBottom: 10 }}>{meal.type}</p>
            <p className="mono small" style={{ marginBottom: 10 }}>
              {meal.calories} kcal · P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g per serving
            </p>

            {missing.length > 0 && (
              <p className="small" style={{ marginBottom: 10 }}>
                <strong>Missing:</strong> {missing.map(formatIngredient).join(', ')}
              </p>
            )}

            <div className="field" style={{ marginBottom: 10 }}>
              <label>Servings to prep</label>
              <input
                type="number" min={1} max={14} value={servings}
                onChange={e => setServingsById(s => ({ ...s, [meal.id]: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>

            <p className="small" style={{ marginBottom: 4 }}>
              <strong>Ingredients{servings > 1 ? ` (×${servings})` : ''}:</strong> {scaled.map(formatIngredient).join(', ')}
            </p>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Portion target: ≈{meal.servingWeightG}g per serving on a food scale
              {servings > 1 ? ` · ≈${totalBatchWeight(meal, servings)}g total for all ${servings} servings` : ''}
            </p>
            <p className="meal-detail" style={{ marginBottom: 12 }}>{meal.recipe}</p>

            <button className="secondary" onClick={() => onLogMeal(meal)}>Log this meal</button>
          </div>
        )
      })}

      {remainingTargets && (
        <p className="muted small" style={{ textAlign: 'center' }}>
          Remaining today: {Math.max(remainingTargets.calories, 0)} kcal · {Math.max(remainingTargets.protein, 0)}g protein
        </p>
      )}
    </div>
  )
}
