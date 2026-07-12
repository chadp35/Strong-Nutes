import React, { useState } from 'react'
import {
  formatIngredient,
  matchPantryToMeals,
} from '../lib/mealPlanner.js'
import AddExtraPanel from './AddExtraPanel.jsx'
import BulkPrepControls from './BulkPrepControls.jsx'

export default function MealPlanTab({ plan, onRegenerate, onRegenerateMeal, onSwapMeal, onRemoveMeal, onAddExtra, targets, savedPantry, personSettings }) {
  const [expanded, setExpanded] = useState(null)
  const [pantryModeKey, setPantryModeKey] = useState(null)
  const [addPanelDay, setAddPanelDay] = useState(null)

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
        Targeting {targets.calories} kcal/day · {targets.protein}g protein. Real whole meals — extra calories come from additional meals or sides, never resized portions.
      </p>

      {plan.map(day => {
        const coreMeals = day.meals.filter(m => m.isCore)
        const extraItems = day.meals.filter(m => !m.isCore)

        return (
          <div className="card day-card" key={day.day}>
            <div className="day-title">Day {day.day} <span className="muted small mono">— {day.totals.calories} kcal</span></div>

            {coreMeals.map((meal, mealIndex) => {
              const key = `${day.day}-core-${mealIndex}-${meal.id}`
              const isPantryMode = pantryModeKey === key
              return (
                <div key={key}>
                  <div className="meal-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === key ? null : key)}>
                    <div>
                      <div className="meal-name">{meal.name}</div>
                      <div className="meal-type">{meal.type}</div>
                    </div>
                    <span className="meal-macros">{meal.calories} kcal</span>
                  </div>
                  {expanded === key && (
                    <div className="meal-detail">
                      <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
                        <button className="secondary" onClick={() => { onRegenerateMeal(day.day, mealIndex); setPantryModeKey(null) }}>
                          🔄 Regenerate this meal
                        </button>
                        <button className="secondary" onClick={() => setPantryModeKey(isPantryMode ? null : key)}>
                          🥫 {isPantryMode ? 'Cancel' : 'Use pantry instead'}
                        </button>
                      </div>

                      {isPantryMode && (
                        <PantrySwap
                          mealType={meal.type}
                          savedPantry={savedPantry}
                          excludeIds={[meal.id]}
                          personSettings={personSettings}
                          onPick={(replacement) => { onSwapMeal(day.day, mealIndex, replacement); setPantryModeKey(null) }}
                        />
                      )}

                      {!isPantryMode && (
                        <>
                          <strong>Recipe:</strong> {meal.recipe}
                          <br />
                          <span className="mono">P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g per serving</span>
                          <BulkPrepControls meal={meal} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {extraItems.length > 0 && (
              <>
                <p className="muted small" style={{ marginTop: 12, marginBottom: 4 }}>
                  Additional meals & sides — closes the gap to your target
                </p>
                {extraItems.map((item, i) => {
                  const overallIndex = coreMeals.length + i
                  const key = `${day.day}-extra-${overallIndex}-${item.id}`
                  return (
                    <div key={key}>
                      <div className="meal-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === key ? null : key)}>
                        <div>
                          <div className="meal-name">{item.name}</div>
                          <div className="meal-type">{item.slotLabel || 'Side'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="meal-macros">{item.calories} kcal</span>
                          <button className="remove-btn" onClick={e => { e.stopPropagation(); onRemoveMeal(day.day, overallIndex) }}>×</button>
                        </div>
                      </div>
                      {expanded === key && item.recipe && (
                        <div className="meal-detail">
                          {item.ingredients?.length > 0 && (
                            <>
                              <strong>Ingredients:</strong> {item.ingredients.map(formatIngredient).join(', ')}
                              <br />
                            </>
                          )}
                          <strong>{item.isExtra ? 'Recipe' : 'How to eat it'}:</strong> {item.recipe}
                          <br />
                          <span className="mono">P{item.protein}g · C{item.carbs}g · F{item.fat}g</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            <button className="secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => setAddPanelDay(addPanelDay === day.day ? null : day.day)}>
              {addPanelDay === day.day ? 'Cancel' : '+ Add a meal or side'}
            </button>

            {addPanelDay === day.day && (
              <AddExtraPanel
                remainingCalories={Math.max(targets.calories - day.totals.calories, 0)}
                remainingProtein={Math.max(targets.protein - day.totals.protein, 0)}
                personSettings={personSettings}
                excludeIds={day.meals.map(m => m.id)}
                onPick={(item, kind) => { onAddExtra(day.day, item, kind); setAddPanelDay(null) }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function PantrySwap({ mealType, savedPantry, excludeIds, personSettings, onPick }) {
  const [pantryText, setPantryText] = useState((savedPantry || []).join('\n'))
  const [results, setResults] = useState(null)

  function find() {
    setResults(matchPantryToMeals(pantryText, { type: mealType, excludeIds, personSettings }))
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
      {results && results.map(({ meal, matched }) => (
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
