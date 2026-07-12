import React, { useState } from 'react'
import { matchPantryToMeals, scaleMealIngredients, totalBatchWeight, formatIngredient } from '../lib/mealPlanner.js'
import { CHAINS, findStoreOptions } from '../data/storeSnacks.js'

const TYPE_OPTIONS = [
  { key: 'any', label: 'Any meal' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

export default function PantryTab({ savedPantry, onSavePantry, onLogMeal, remainingTargets }) {
  const [mode, setMode] = useState('kitchen') // 'kitchen' | 'onthego'

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button
          className="secondary"
          style={{
            flex: 1, fontWeight: 700,
            background: mode === 'kitchen' ? 'var(--fuel)' : 'var(--surface-2)',
            color: mode === 'kitchen' ? '#12140f' : 'var(--text)',
            borderColor: mode === 'kitchen' ? 'var(--fuel)' : 'var(--border)',
          }}
          onClick={() => setMode('kitchen')}
        >
          My Pantry
        </button>
        <button
          className="secondary"
          style={{
            flex: 1, fontWeight: 700,
            background: mode === 'onthego' ? 'var(--fuel)' : 'var(--surface-2)',
            color: mode === 'onthego' ? '#12140f' : 'var(--text)',
            borderColor: mode === 'onthego' ? 'var(--fuel)' : 'var(--border)',
          }}
          onClick={() => setMode('onthego')}
        >
          On the Go
        </button>
      </div>

      {mode === 'kitchen' && (
        <KitchenMode savedPantry={savedPantry} onSavePantry={onSavePantry} onLogMeal={onLogMeal} remainingTargets={remainingTargets} />
      )}
      {mode === 'onthego' && (
        <OnTheGoMode onLogMeal={onLogMeal} remainingTargets={remainingTargets} />
      )}
    </div>
  )
}

function KitchenMode({ savedPantry, onSavePantry, onLogMeal, remainingTargets }) {
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
    <div>
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

function OnTheGoMode({ onLogMeal, remainingTargets }) {
  const [chainKey, setChainKey] = useState('7eleven')
  const [mealType, setMealType] = useState('any')
  const [results, setResults] = useState(null)

  const chain = CHAINS.find(c => c.key === chainKey)

  function find() {
    setResults(findStoreOptions({
      chainKey,
      mealType,
      remainingCalories: remainingTargets?.calories,
      remainingProtein: remainingTargets?.protein,
    }))
  }

  return (
    <div>
      <p className="muted small" style={{ marginBottom: 4 }}>
        Generally available picks by chain — not live inventory for one specific location, so double-check the label. Ranked to fit what's left in your day.
      </p>
      {remainingTargets && (
        <p className="mono small muted" style={{ marginBottom: 16 }}>
          Remaining today: {Math.max(Math.round(remainingTargets.calories), 0)} kcal · {Math.max(Math.round(remainingTargets.protein), 0)}g protein
        </p>
      )}

      <div className="card">
        <div className="field">
          <label>Where are you?</label>
          <select value={chainKey} onChange={e => setChainKey(e.target.value)}>
            {CHAINS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {chain?.note && <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>{chain.note}</p>}
        </div>
        <div className="field">
          <label>Looking for</label>
          <select value={mealType} onChange={e => setMealType(e.target.value)}>
            <option value="any">Anything</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">A real meal</option>
            <option value="snack">Just a snack</option>
          </select>
        </div>
        <button className="primary" onClick={find}>Find options</button>
      </div>

      {results && results.length === 0 && (
        <div className="empty-state">
          <h3>Nothing quite fits</h3>
          <p className="small">Try "Anything" for the meal filter, or a nearby chain type.</p>
        </div>
      )}

      {results && results.map(item => (
        <div className="meal-row" key={item.id}>
          <div>
            <div className="meal-name">{item.name}</div>
            <div className="meal-macros">{item.calories} kcal · P{item.protein}g · C{item.carbs}g · F{item.fat}g</div>
          </div>
          <button className="secondary" onClick={() => onLogMeal(item)}>Log it</button>
        </div>
      ))}
    </div>
  )
}
