import React, { useMemo, useState } from 'react'
import {
  searchIngredients, availableUnitsFor, calculateRecipeTotals,
  applyDrainedFat, suggestServings, computePerServing, ingredientFromOFF,
} from '../lib/recipeBuilder.js'
import { searchBrandedFoods } from '../lib/openFoodFacts.js'
import { conflictsWithAllergies, ALLERGEN_OPTIONS } from '../data/allergens.js'
import { ALL_TAGS } from '../data/foods.js'

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

export default function RecipeBuilder({ allergies, onSaveRecipe, onDone }) {
  const [name, setName] = useState('')
  const [lines, setLines] = useState([]) // { ingredient, qty, unit, isWrapper }
  const [query, setQuery] = useState('')
  const [webResults, setWebResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [drainedFatTbsp, setDrainedFatTbsp] = useState('')
  const [actualWeight, setActualWeight] = useState('')
  const [servings, setServings] = useState(null) // null until first computed
  const [mealType, setMealType] = useState('dinner')
  const [selectedTags, setSelectedTags] = useState([])
  const [notes, setNotes] = useState('')

  const localResults = useMemo(() => searchIngredients(query), [query])

  const { totals: rawTotals } = calculateRecipeTotals(lines)
  const adjustedTotals = applyDrainedFat(rawTotals, Number(drainedFatTbsp) || 0)
  const effectiveServings = servings || suggestServings(adjustedTotals.calories || 500)
  const perServing = computePerServing(adjustedTotals, effectiveServings, Number(actualWeight) || 0)

  const conflict = allergies?.length > 0 && conflictsWithAllergies({ ingredients: lines.map(l => ({ name: l.ingredient.name })) }, allergies)

  function addLine(ingredient) {
    const units = availableUnitsFor(ingredient)
    setLines(ls => [...ls, { ingredient, qty: 1, unit: units[0], isWrapper: false }])
    setQuery('')
    setWebResults([])
  }

  async function searchWeb() {
    if (query.trim().length < 2) return
    setSearching(true)
    try {
      const results = await searchBrandedFoods(query)
      setWebResults(results)
    } catch {
      setWebResults([])
    } finally {
      setSearching(false)
    }
  }

  function updateLine(index, patch) {
    setLines(ls => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function removeLine(index) {
    setLines(ls => ls.filter((_, i) => i !== index))
  }

  function toggleTag(tag) {
    setSelectedTags(ts => (ts.includes(tag) ? ts.filter(t => t !== tag) : [...ts, tag]))
  }

  function save() {
    if (!name.trim() || lines.length === 0) return
    const s = Math.max(effectiveServings, 1)
    const perServingIngredients = lines.map(l => ({
      name: l.ingredient.name,
      qty: Math.round((l.qty / s) * 100) / 100,
      unit: l.unit === 'serving' ? '' : l.unit,
      ...(l.isWrapper ? { isWrapper: true } : {}),
    }))

    onSaveRecipe({
      id: `recipe-${Date.now()}`,
      name: name.trim(),
      type: mealType,
      tags: selectedTags,
      calories: perServing.calories,
      protein: perServing.protein,
      carbs: perServing.carbs,
      fat: perServing.fat,
      servingWeightG: perServing.weightG,
      ingredients: perServingIngredients,
      recipe: notes.trim() || 'Custom recipe you created.',
      isCustomRecipe: true,
    })
    onDone?.()
  }

  return (
    <div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Enter what actually goes into the dish and I'll calculate the nutrition —
        including handling for drained fat and real cooked weight, so bulk-cooked
        dishes portion accurately.
      </p>

      <div className="field">
        <label>Recipe name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grandma's turkey chili" />
      </div>

      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <h2>Ingredients</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search ingredients, e.g. chicken breast"
            style={{ flex: 1 }}
          />
        </div>

        {localResults.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {localResults.map(ing => (
              <div className="meal-row" style={{ cursor: 'pointer' }} key={ing.id} onClick={() => addLine(ing)}>
                <div className="meal-name">{ing.name}</div>
                <span className="meal-macros">{ing.per100g.calories} kcal/100g</span>
              </div>
            ))}
          </div>
        )}

        {localResults.length === 0 && query.trim().length >= 2 && (
          <div style={{ marginBottom: 10 }}>
            <p className="muted small" style={{ marginBottom: 8 }}>Not in the local list.</p>
            <button className="secondary" onClick={searchWeb} disabled={searching}>
              {searching ? 'Searching…' : 'Search the web instead'}
            </button>
            {webResults.map(food => (
              <div
                className="meal-row" style={{ cursor: 'pointer' }} key={food.id}
                onClick={() => addLine(ingredientFromOFF(food))}
              >
                <div>
                  <div className="meal-name">{food.name}</div>
                  <div className="meal-type">{food.brand || 'Branded food'}</div>
                </div>
                <span className="meal-macros">{food.caloriesPer100g} kcal/100g</span>
              </div>
            ))}
          </div>
        )}

        {lines.length === 0 && (
          <p className="muted small">No ingredients added yet.</p>
        )}

        {lines.map((line, i) => {
          const units = availableUnitsFor(line.ingredient)
          return (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="meal-name" style={{ fontSize: 14 }}>{line.ingredient.name}</span>
                <button className="remove-btn" onClick={() => removeLine(i)}>×</button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number" min={0} step="0.1" value={line.qty}
                  onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                  style={{ width: 80 }}
                />
                <select value={line.unit} onChange={e => updateLine(i, { unit: e.target.value })} style={{ flex: 1 }}>
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, cursor: 'pointer' }}
                onClick={() => updateLine(i, { isWrapper: !line.isWrapper })}
              >
                <div className={`checkbox ${line.isWrapper ? 'on' : ''}`}>{line.isWrapper ? '✓' : ''}</div>
                <span className="muted small">Wrapper item (tortilla, bun) — not part of the bulk-cooked filling</span>
              </div>
            </div>
          )
        })}
      </div>

      {lines.length > 0 && (
        <>
          <div className="card">
            <h2>Raw totals</h2>
            <p className="mono">
              {rawTotals.calories} kcal · P{Math.round(rawTotals.protein)}g · C{Math.round(rawTotals.carbs)}g · F{Math.round(rawTotals.fat)}g
            </p>
            <p className="muted small" style={{ marginBottom: 0 }}>
              Cooking heat doesn't remove calories from protein, carbs, or fat — only material that's
              physically drained away (like fat after browning) actually changes the totals.
            </p>
          </div>

          <div className="card">
            <h2>Did you drain any fat?</h2>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Tablespoons of fat/drippings drained off (optional)</label>
              <input
                type="number" min={0} value={drainedFatTbsp}
                onChange={e => setDrainedFatTbsp(e.target.value)}
                placeholder="0"
                style={{ maxWidth: 120 }}
              />
            </div>
          </div>

          <div className="card">
            <h2>Servings &amp; portioning</h2>
            <div className="field">
              <label>How many servings does this make?</label>
              <input
                type="number" min={1} max={20}
                value={effectiveServings}
                onChange={e => setServings(Math.max(1, Number(e.target.value) || 1))}
                style={{ maxWidth: 100 }}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Weigh the finished dish? (optional, for accurate portioning)</label>
              <input
                type="number" value={actualWeight} onChange={e => setActualWeight(e.target.value)}
                placeholder={`~${rawTotals.grams ? Math.round(rawTotals.grams) : 0}g estimated from raw ingredients`}
              />
              <p className="muted small" style={{ marginTop: 4, marginBottom: 0 }}>
                Simmered/braised dishes often gain water weight; weighing the real result gives a much
                more accurate "grams per container" than estimating from raw ingredients alone.
              </p>
            </div>
          </div>

          <div className="card" style={{ borderColor: 'var(--fuel)' }}>
            <h2>Per serving</h2>
            <p className="odometer" style={{ fontSize: 30, color: 'var(--fuel)', marginBottom: 8 }}>{perServing.calories} <span className="odometer-unit">kcal</span></p>
            <p className="mono" style={{ marginBottom: 8 }}>
              P{perServing.protein}g · C{perServing.carbs}g · F{perServing.fat}g
            </p>
            <p className="muted small" style={{ marginBottom: 0 }}>≈{perServing.weightG}g per portion on a food scale</p>
          </div>

          {conflict && (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <p className="small" style={{ color: 'var(--danger)', marginBottom: 0 }}>
                ⚠️ This recipe contains an ingredient that matches an allergy on your profile
                ({ALLERGEN_OPTIONS.filter(a => allergies.includes(a.key)).map(a => a.label).join(', ')}).
                You can still save it — this is just a heads-up in case that's unintentional.
              </p>
            </div>
          )}

          <div className="card">
            <h2>Meal type &amp; tags</h2>
            <div className="field">
              <label>When would you eat this?</label>
              <select value={mealType} onChange={e => setMealType(e.target.value)}>
                {MEAL_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <label style={{ marginBottom: 8 }}>Tags (helps it show up in your plan when relevant)</label>
            <div className="tag-grid" style={{ marginBottom: 12 }}>
              {ALL_TAGS.map(tag => (
                <div key={tag} className={`tag-chip ${selectedTags.includes(tag) ? 'like' : ''}`} onClick={() => toggleTag(tag)}>
                  {tag}
                </div>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Notes / how to make it (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Brief recipe notes" />
            </div>
          </div>

          <button className="primary" disabled={!name.trim()} style={{ opacity: name.trim() ? 1 : 0.5 }} onClick={save}>
            Save to my recipes
          </button>
        </>
      )}
    </div>
  )
}
