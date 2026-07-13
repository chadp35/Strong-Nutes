import React, { useState } from 'react'
import { formatIngredient } from '../lib/mealPlanner.js'
import AddExtraPanel from './AddExtraPanel.jsx'
import BulkPrepControls from './BulkPrepControls.jsx'
import MealSwapPanel from './MealSwapPanel.jsx'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export default function MealPlanTab({
  plan, onRegenerate, onCancelPlan, onRegenerateMeal, onSwapMeal, onRemoveMeal, onAddExtra, onReplaceMeal,
  targets, savedPantry, personSettings, customRecipes, discoveredProducts, onRecordDiscovered,
}) {
  const [expanded, setExpanded] = useState(null)
  const [swapKey, setSwapKey] = useState(null)
  const [addPanelDay, setAddPanelDay] = useState(null)
  const [startDate, setStartDate] = useState(plan?.[0]?.date || todayKey())
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  if (!plan) {
    return (
      <div className="app-shell" style={{ paddingTop: 20 }}>
        <div className="empty-state">
          <h3>No plan yet</h3>
          <p className="small">Generate a meal plan built around your targets and preferences.</p>
          <div className="field" style={{ textAlign: 'left', marginTop: 18, marginBottom: 10 }}>
            <label>Start date (this becomes Day 1)</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <button className="primary" onClick={() => onRegenerate(7, startDate)}>
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
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Targeting {targets.calories} kcal/day · {targets.protein}g protein. Real whole meals — extra calories come from additional meals or sides, never resized portions.
      </p>

      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Day 1 start date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ maxWidth: 200 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="secondary" style={{ flex: '1 1 140px' }} onClick={() => onRegenerate(plan.length, startDate)}>
            🔄 Regenerate all
          </button>
          {!confirmingCancel && (
            <button className="secondary" style={{ flex: '1 1 140px', color: 'var(--danger)' }} onClick={() => setConfirmingCancel(true)}>
              🗑 Cancel plan
            </button>
          )}
          {confirmingCancel && (
            <>
              <button className="secondary" style={{ flex: '1 1 100px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={onCancelPlan}>
                Yes, cancel it
              </button>
              <button className="secondary" style={{ flex: '1 1 100px' }} onClick={() => setConfirmingCancel(false)}>
                Never mind
              </button>
            </>
          )}
        </div>
      </div>

      {plan.map(day => {
        const coreMeals = day.meals.filter(m => m.isCore)
        const extraItems = day.meals.filter(m => !m.isCore)
        const isToday = day.date === todayKey()

        return (
          <div className="card day-card" key={day.day} style={isToday ? { borderColor: 'var(--fuel)' } : undefined}>
            <div className="day-title">
              {day.dateLabel || `Day ${day.day}`}
              {isToday && <span className="mono small" style={{ color: 'var(--fuel)', marginLeft: 8 }}>TODAY</span>}
              {' '}<span className="muted small mono">— {day.totals.calories} kcal</span>
            </div>

            {coreMeals.map((meal, mealIndex) => {
              const key = `${day.day}-core-${mealIndex}-${meal.id}`
              const overallIndex = day.meals.indexOf(meal)
              const isSwapping = swapKey === key
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
                      <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px', flexWrap: 'wrap' }}>
                        <button className="secondary" onClick={() => { onRegenerateMeal(day.day, mealIndex); setSwapKey(null) }}>
                          🔄 Regenerate
                        </button>
                        <button className="secondary" onClick={() => setSwapKey(isSwapping ? null : key)}>
                          🔁 {isSwapping ? 'Cancel change' : 'Change this meal'}
                        </button>
                        {coreMeals.length > 1 && (
                          <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => { onRemoveMeal(day.day, overallIndex); setExpanded(null) }}>
                            Remove
                          </button>
                        )}
                      </div>

                      {isSwapping && (
                        <MealSwapPanel
                          mealType={meal.type}
                          excludeIds={coreMeals.map(m => m.id)}
                          personSettings={personSettings}
                          customRecipes={customRecipes}
                          savedPantry={savedPantry}
                          discoveredProducts={discoveredProducts}
                          onRecordDiscovered={onRecordDiscovered}
                          onPick={(item) => { onSwapMeal(day.day, mealIndex, item); setSwapKey(null) }}
                          onCancel={() => setSwapKey(null)}
                        />
                      )}

                      {!isSwapping && (
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
                  const isSwapping = swapKey === key
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
                      {expanded === key && (
                        <div className="meal-detail">
                          <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px' }}>
                            <button className="secondary" onClick={() => setSwapKey(isSwapping ? null : key)}>
                              🔁 {isSwapping ? 'Cancel change' : 'Change this'}
                            </button>
                          </div>

                          {isSwapping && (
                            <MealSwapPanel
                              mealType="any"
                              excludeIds={day.meals.map(m => m.id)}
                              personSettings={personSettings}
                              customRecipes={customRecipes}
                              savedPantry={savedPantry}
                              discoveredProducts={discoveredProducts}
                              onRecordDiscovered={onRecordDiscovered}
                              onPick={(newItem, kind) => { onReplaceMeal(day.day, overallIndex, newItem, kind); setSwapKey(null) }}
                              onCancel={() => setSwapKey(null)}
                            />
                          )}

                          {!isSwapping && item.recipe && (
                            <>
                              {item.ingredients?.length > 0 && (
                                <>
                                  <strong>Ingredients:</strong> {item.ingredients.map(formatIngredient).join(', ')}
                                  <br />
                                </>
                              )}
                              <strong>{item.isExtra ? 'Recipe' : 'How to eat it'}:</strong> {item.recipe}
                              <br />
                              <span className="mono">P{item.protein}g · C{item.carbs}g · F{item.fat}g</span>
                            </>
                          )}
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
                customRecipes={customRecipes}
                discoveredProducts={discoveredProducts}
                onRecordDiscovered={onRecordDiscovered}
                onPick={(item, kind) => { onAddExtra(day.day, item, kind); setAddPanelDay(null) }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
