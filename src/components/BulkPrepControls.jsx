import React, { useState } from 'react'
import { scaleMealIngredients, formatIngredient, totalBatchWeight } from '../lib/mealPlanner.js'

// Handles the "I'm batch cooking this" case properly:
// - Ingredients scale normally for shopping/cooking (that's just "buy N times
//   as much" — totally legitimate, unlike auto-scaling a single serving).
// - If the recipe wraps a filling (burritos, wraps, quesadillas), the wrapper
//   itself (tortilla) is called out separately — you bulk-cook the filling,
//   then wrap fresh portions at serving time, not resize the tortilla.
// - Macros per portion are simply the recipe's stated per-serving values,
//   unchanged no matter what the batch weighs — cooking changes water
//   content, not nutrient content. What DOES change is how many grams to put
//   in each container, which is why weighing the real cooked total matters.
export default function BulkPrepControls({ meal }) {
  // Raw string state so the field can go empty while typing instead of
  // snapping straight back to "1" on every backspace.
  const [servingsInput, setServingsInput] = useState('1')
  const servings = Math.max(1, Number(servingsInput) || 1)
  const [actualWeight, setActualWeight] = useState('')

  const wrapperIngredients = (meal.ingredients || []).filter(i => i.isWrapper)
  const bulkIngredients = (meal.ingredients || []).filter(i => !i.isWrapper)
  const hasWrapper = wrapperIngredients.length > 0

  const scaledBulk = scaleMealIngredients({ ingredients: bulkIngredients }, servings)
  const scaledWrapper = scaleMealIngredients({ ingredients: wrapperIngredients }, servings)

  const estimatedWeight = totalBatchWeight(meal, servings)
  const actualNum = Number(actualWeight)
  const usingActual = actualNum > 0
  const perPortionWeight = Math.round((usingActual ? actualNum : estimatedWeight) / servings)

  return (
    <div style={{ marginTop: 10 }}>
      <div className="field" style={{ marginBottom: 10 }}>
        <label>Batch cooking? Servings to make</label>
        <input
          type="number" min={1} max={20} value={servingsInput}
          onChange={e => setServingsInput(e.target.value)}
          style={{ maxWidth: 100 }}
        />
      </div>

      {hasWrapper ? (
        <>
          <p className="small" style={{ marginBottom: 4 }}>
            <strong>Bulk-cook the filling:</strong> {scaledBulk.map(formatIngredient).join(', ')}
          </p>
          <p className="small muted" style={{ marginBottom: 10 }}>
            Wrap fresh at serving time — grab {scaledWrapper.map(formatIngredient).join(', ')} per batch, one per portion.
          </p>
        </>
      ) : (
        <p className="small" style={{ marginBottom: 10 }}>
          <strong>Ingredients{servings > 1 ? ` (×${servings})` : ''}:</strong> {scaledBulk.map(formatIngredient).join(', ')}
        </p>
      )}

      {servings > 1 && (
        <>
          <div className="field" style={{ marginBottom: 8 }}>
            <label>After cooking, weigh the total {hasWrapper ? 'filling' : 'batch'} (optional, for accuracy)</label>
            <input
              type="number" value={actualWeight} onChange={e => setActualWeight(e.target.value)}
              placeholder={`~${estimatedWeight}g estimated`}
            />
          </div>
          <p className="small" style={{ marginBottom: 4 }}>
            <strong>Portion into {servings} containers of ≈{perPortionWeight}g each{usingActual ? '' : ' (estimated)'}.</strong>
          </p>
          <p className="muted small" style={{ marginBottom: 0 }}>
            Each portion is still {meal.calories} kcal · P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g regardless —
            cooking changes water weight, not nutrition, so weighing just tells you how much to put in each container, not how much it "counts as."
          </p>
        </>
      )}
    </div>
  )
}
