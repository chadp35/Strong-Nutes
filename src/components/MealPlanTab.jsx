import React, { useState } from 'react'
import { scaleMealIngredients, totalBatchWeight, formatIngredient } from '../lib/mealPlanner.js'

export default function MealPlanTab({ plan, onRegenerate, targets }) {
  const [expanded, setExpanded] = useState(null)
  const [servingsById, setServingsById] = useState({})

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
        <button className="secondary" onClick={() => onRegenerate(7)}>Regenerate</button>
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Targeting {targets.calories} kcal/day · {targets.protein}g protein
      </p>

      {plan.map(day => (
        <div className="card day-card" key={day.day}>
          <div className="day-title">Day {day.day} <span className="muted small mono">— {day.totals.calories} kcal</span></div>
          {day.meals.map(meal => {
            const key = `${day.day}-${meal.id}`
            const servings = servingsById[key] || 1
            const scaled = scaleMealIngredients(meal, servings)
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
                    <div style={{ margin: '8px 0' }}>
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
                    <span className="muted">
                      ≈{meal.servingWeightG}g per portion on a food scale
                      {servings > 1 ? ` · ≈${totalBatchWeight(meal, servings)}g total for ${servings} servings` : ''}
                    </span>
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
