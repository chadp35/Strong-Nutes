import React, { useState } from 'react'
import { scaleMealIngredients, totalBatchWeight, formatIngredient, matchPantryToMeals } from '../lib/mealPlanner.js'

export default function MealPlanTab({ plan, onRegenerate, onRegenerateMeal, onSwapMeal, targets, savedPantry }) {
  const [expanded, setExpanded] = useState(null)
  const [servingsById, setServingsById] = useState({})
  const [pantryModeKey, setPantryModeKey] = useState(null)

  if (!plan) {
    return (
      <div className="app-shell" style={{ paddingTop: 20 }}>
        <div className="empty-state">
          <h3>No plan yet</h3>
          <p className="small">Generate a meal plan built around your targets and preferences.</p>
          <button className="primary" style={{ marginTop: 14 }} onClick={() => onRegenerate(7)}>
            Generate 7-day plan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: 20 }}>Your meal plan</h1>
        <button className="secondary" onClick={() => onRegenerate(7)}>Regenerate all</button>
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Targeting {targets.calories} kcal/day · {targets.protein}g protein. Tap any meal to swap it.
      </p>

      {plan.map(day => (
        <div className="card day-card" key={day.day}>
          <div className="day-title">Day {day.day} <span className="muted small mono">— {day.totals.calories} kcal</span></div>
          {day.meals.map((meal, mealIndex) => {
            const key = `${day.day}-${mealIndex}-${meal.id}`
            const servings = servingsById[key] || 1
            const scaled = scaleMealIngredients(meal, servings)
            const isPantryMode = pantryModeKey === key
            return (
              <div key={key}>
                <div className="meal-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === key ? null : key)}>
                  <div>
                    <div className="meal-name">{meal.name}</div>
                    <div className="meal-type">
                      {meal.type}{meal.portionMultiplier && meal.portionMultiplier !== 1 ? ` · ${meal.portionMultiplier}× serving` : ''}
                    </div>
                  </div>
                  <span className="meal-macros">{meal.calories} kcal</span>
                </div>
                {expanded === key && (
                  <div className="meal-detail">
                    <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
                      <button
                        className="secondary"
                        onClick={() => { onRegenerateMeal(day.day, mealIndex); setPantryModeKey(null) }}
                      >
                        🔄 Regenerate this meal
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setPantryModeKey(isPantryMode ? null : key)}
                      >
                        🥫 {isPantryMode ? 'Cancel' : 'Use pantry instead'}
                      </button>
                    </div>

                    {isPantryMode && (
                      <PantrySwap
                        mealType={meal.type}
                        savedPantry={savedPantry}
                        excludeIds={[meal.id]}
                        onPick={(replacement) => {
                          onSwapMeal(day.day, mealIndex, replacement)
                          setPantryModeKey(null)
                        }}
                      />
                    )}

                    {!isPantryMode && (
                      <>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ marginBottom: 4 }}>Prepping ahead? Servings to batch:</label>
                          <input
                            type="number" min={1} max={14} value={servings}
                            onChange={e => setServingsById(s => ({ ...s, [key]: Math.max(1, Number(e.target.value) || 1) }))}
                            style={{ maxWidth: 100 }}
                          />
                        </div>
                        <strong>Ingredients{servings > 1 ? ` (×${servings})` : ''}:</strong> {scaled.map(formatIngredient).join(', ')}
                        <br />
                        <strong>Recipe:</strong> {meal.recipe}
                        <br />
                        <span className="mono">P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g per serving</span>
                        <br />
                        {meal.portionMultiplier && meal.portionMultiplier !== 1 && (
                          <>
                            <span className="muted">
                              Sized to {meal.portionMultiplier}× a standard serving to help hit your daily calorie target.
                            </span>
                            <br />
                          </>
                        )}
                        <span className="muted">
                          ≈{meal.servingWeightG}g per portion on a food scale
                          {servings > 1 ? ` · ≈${totalBatchWeight(meal, servings)}g total for ${servings} servings` : ''}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PantrySwap({ mealType, savedPantry, excludeIds, onPick }) {
  const [pantryText, setPantryText] = useState((savedPantry || []).join('\n'))
  const [results, setResults] = useState(null)

  function find() {
    setResults(matchPantryToMeals(pantryText, { type: mealType, excludeIds }))
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div className="field">
        <label>What do you have for {mealType}?</label>
        <textarea
          value={pantryText}
          onChange={e => setPantryText(e.target.value)}
          rows={3}
          style={{
            width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '10px 11px', borderRadius: 10, fontSize: 14,
            fontFamily: 'Inter', resize: 'vertical',
          }}
        />
      </div>
      <button className="secondary" style={{ marginBottom: 10 }} onClick={find}>Find a match</button>

      {results && results.length === 0 && <p className="muted small">No matches — try adding a staple or two.</p>}
      {results && results.map(({ meal, matched, missing }) => (
        <div className="meal-row" key={meal.id} style={{ cursor: 'pointer' }} onClick={() => onPick(meal)}>
          <div>
            <div className="meal-name">{meal.name}</div>
            <div className="meal-type">{matched.length}/{meal.ingredients.length} on hand</div>
          </div>
          <span className="meal-macros">{meal.calories} kcal</span>
        </div>
      ))}
    </div>
  )
}
