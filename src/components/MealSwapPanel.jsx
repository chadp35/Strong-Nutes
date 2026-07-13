import React, { useState } from 'react'
import { browseMeals, matchPantryToMeals, suggestPantryCombo } from '../lib/mealPlanner.js'
import { searchBrandedFoods, macrosForGrams, getProductByBarcode } from '../lib/openFoodFacts.js'
import { searchLocalProducts } from '../lib/localProductSearch.js'
import BarcodeScanner from './BarcodeScanner.jsx'

const TABS = [
  { key: 'browse', label: 'Browse' },
  { key: 'recipes', label: 'My Recipes' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'search', label: 'Web Search' },
]

// The full "change this meal" panel used by the Plan tab — replaces the old
// pantry-only swap with four ways to find a replacement: browse the built-in
// meal database, pick one of your own saved recipes, match against what's in
// your pantry, or search the web/scan a barcode for a branded product.
// Works the same whether swapping a core meal or an extra/side.
export default function MealSwapPanel({
  mealType = 'any', excludeIds = [], personSettings, customRecipes,
  savedPantry, discoveredProducts, onRecordDiscovered, onPick, onCancel,
}) {
  const [tab, setTab] = useState('browse')

  return (
    <div className="card" style={{ background: 'var(--surface-2)', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className="secondary"
            style={{
              flex: '1 1 72px', fontWeight: 700, fontSize: 12,
              background: tab === t.key ? 'var(--fuel)' : 'var(--surface)',
              color: tab === t.key ? 'var(--on-fuel)' : 'var(--text)',
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <BrowseList mealType={mealType} excludeIds={excludeIds} personSettings={personSettings} onPick={item => onPick(item, 'meal')} />
      )}
      {tab === 'recipes' && (
        <RecipesList customRecipes={customRecipes} onPick={item => onPick(item, 'meal')} />
      )}
      {tab === 'pantry' && (
        <PantryMatch mealType={mealType} excludeIds={excludeIds} personSettings={personSettings} savedPantry={savedPantry} onPick={item => onPick(item, 'meal')} />
      )}
      {tab === 'search' && (
        <WebSearch discoveredProducts={discoveredProducts} onRecordDiscovered={onRecordDiscovered} onPick={item => onPick(item, 'side')} />
      )}

      {onCancel && (
        <button className="secondary" style={{ width: '100%', marginTop: 10 }} onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}

function BrowseList({ mealType, excludeIds, personSettings, onPick }) {
  const results = browseMeals({ type: mealType, personSettings, excludeIds }).slice(0, 25)
  if (results.length === 0) {
    return <p className="muted small">Nothing matches your current filters for this meal type — try Web Search instead.</p>
  }
  return (
    <div>
      {results.map(meal => (
        <div className="meal-row" key={meal.id} style={{ cursor: 'pointer' }} onClick={() => onPick(meal)}>
          <div>
            <div className="meal-name">{meal.name}</div>
            <div className="meal-type">{meal.type}</div>
          </div>
          <span className="meal-macros">{meal.calories} kcal</span>
        </div>
      ))}
    </div>
  )
}

function RecipesList({ customRecipes, onPick }) {
  if (!customRecipes || customRecipes.length === 0) {
    return <p className="muted small">No saved recipes yet. Build one from the Pantry tab's "My Recipe" mode.</p>
  }
  return (
    <div>
      {customRecipes.map(r => (
        <div className="meal-row" key={r.id} style={{ cursor: 'pointer' }} onClick={() => onPick(r)}>
          <div>
            <div className="meal-name">{r.name}</div>
            <div className="meal-type">{r.type}</div>
          </div>
          <span className="meal-macros">{r.calories} kcal</span>
        </div>
      ))}
    </div>
  )
}

function PantryMatch({ mealType, excludeIds, personSettings, savedPantry, onPick }) {
  const [pantryText, setPantryText] = useState((savedPantry || []).join('\n'))
  const [results, setResults] = useState(null)
  const [combo, setCombo] = useState(null)

  function find() {
    setResults(matchPantryToMeals(pantryText, { type: mealType, excludeIds, personSettings }))
    setCombo(suggestPantryCombo(pantryText))
  }

  return (
    <div>
      <div className="field">
        <label>What do you have on hand?</label>
        <textarea
          value={pantryText}
          onChange={e => setPantryText(e.target.value)}
          rows={3}
          style={{
            width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '10px 11px', borderRadius: 10, fontSize: 14,
            fontFamily: 'Inter', resize: 'vertical',
          }}
        />
        {(!savedPantry || savedPantry.length === 0) && (
          <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>
            Tip: save your staples on the Pantry tab's "My Pantry" mode and they'll show up here automatically next time.
          </p>
        )}
      </div>
      <button className="secondary" style={{ marginBottom: 10 }} onClick={find}>Find a match</button>

      {combo && !combo.isPartial && (
        <div className="meal-row" style={{ cursor: 'pointer', background: 'var(--surface)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }} onClick={() => onPick(combo)}>
          <div>
            <div className="meal-name">✨ {combo.name}</div>
            <div className="meal-type">Built from what you have</div>
          </div>
          <span className="meal-macros">{combo.calories} kcal</span>
        </div>
      )}

      {results && results.length === 0 && !combo && (
        <p className="muted small">No matches for that — try adding a staple or two, or use Browse / Web Search instead.</p>
      )}
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

function WebSearch({ discoveredProducts, onRecordDiscovered, onPick }) {
  const [query, setQuery] = useState('')
  const [webResults, setWebResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [scanning, setScanning] = useState(false)
  const [searchedWeb, setSearchedWeb] = useState(false)

  const localResults = searchLocalProducts(query, discoveredProducts)

  async function searchWeb() {
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    setSearchedWeb(true)
    try {
      setWebResults(await searchBrandedFoods(query))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function selectFood(food) {
    setSelected(food)
    setGrams(food.servingGrams || 100)
  }

  async function handleBarcodeDetected(code) {
    setScanning(false)
    setLoading(true)
    setError('')
    try {
      selectFood(await getProductByBarcode(code))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (scanning) {
    return <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
  }

  if (selected) {
    const macros = macrosForGrams(selected, Number(grams) || 0)
    return (
      <div>
        <p className="meal-name" style={{ marginBottom: 2 }}>{selected.name}</p>
        {selected.brand && <p className="muted small" style={{ marginBottom: 10 }}>{selected.brand}</p>}
        <div className="field">
          <label>Amount (grams)</label>
          <input type="number" value={grams} onChange={e => { const v = e.target.value; setGrams(v === '' ? '' : Number(v)) }} />
        </div>
        <p className="mono small" style={{ marginBottom: 12 }}>
          {macros.calories} kcal · P{macros.protein}g · C{macros.carbs}g · F{macros.fat}g
        </p>
        <button
          className="primary"
          onClick={() => {
            onRecordDiscovered?.(selected)
            onPick({
              id: `web-${selected.id}-${Date.now()}`,
              name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
              ...macros,
              recipe: 'Added from search — check the label for the exact serving.',
              ingredients: [],
            })
          }}
        >
          Use this
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Great Value grilled chicken" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && searchWeb()} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="secondary" style={{ flex: 1 }} onClick={() => setScanning(true)}>📷 Scan barcode</button>
        <button className="secondary" style={{ flex: 1 }} onClick={searchWeb} disabled={loading}>🌐 Search web</button>
      </div>

      {localResults.length > 0 && (
        <>
          <p className="muted small" style={{ marginBottom: 6 }}>Instant matches</p>
          {localResults.map(food => (
            <div className="meal-row" style={{ cursor: 'pointer' }} key={food.id} onClick={() => selectFood(food)}>
              <div>
                <div className="meal-name">{food.name}</div>
                <div className="meal-type">{food.brand || 'Branded food'}</div>
              </div>
              <span className="meal-macros">{food.caloriesPer100g} kcal/100g</span>
            </div>
          ))}
        </>
      )}

      {loading && <p className="muted small">{query.trim() ? 'Searching…' : 'Looking up barcode…'}</p>}
      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
      {searchedWeb && !loading && webResults.length === 0 && (
        <p className="muted small">No web matches. Try a shorter or more generic term.</p>
      )}
      {webResults.length > 0 && (
        <>
          <p className="muted small" style={{ marginTop: localResults.length > 0 ? 10 : 0, marginBottom: 6 }}>From the web</p>
          {webResults.map(food => (
            <div className="meal-row" style={{ cursor: 'pointer' }} key={food.id} onClick={() => selectFood(food)}>
              <div>
                <div className="meal-name">{food.name}</div>
                <div className="meal-type">{food.brand || 'Branded food'}</div>
              </div>
              <span className="meal-macros">{food.caloriesPer100g} kcal/100g</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
