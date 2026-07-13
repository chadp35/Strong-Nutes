import React, { useState } from 'react'
import { suggestSides, scaleItemToGrams } from '../lib/mealPlanner.js'
import { searchBrandedFoods, macrosForGrams, getProductByBarcode } from '../lib/openFoodFacts.js'
import { searchLocalProducts } from '../lib/localProductSearch.js'
import BarcodeScanner from './BarcodeScanner.jsx'

const TABS = [
  { key: 'suggested', label: 'Suggested' },
  { key: 'recipes', label: 'My Recipes' },
  { key: 'search', label: 'Search' },
]

export default function AddExtraPanel({ remainingCalories, remainingProtein, personSettings, excludeIds, customRecipes, discoveredProducts, onRecordDiscovered, onPick }) {
  const [tab, setTab] = useState('suggested')

  return (
    <div className="card" style={{ background: 'var(--surface-2)', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            className="secondary"
            style={{
              flex: 1, fontWeight: 700, fontSize: 13,
              background: tab === t.key ? 'var(--fuel)' : 'var(--surface)',
              color: tab === t.key ? 'var(--on-fuel)' : 'var(--text)',
            }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'suggested' && (
        <SuggestedList
          remainingCalories={remainingCalories}
          remainingProtein={remainingProtein}
          personSettings={personSettings}
          excludeIds={excludeIds}
          onPick={(item) => onPick(item, 'side')}
        />
      )}
      {tab === 'recipes' && (
        <MyRecipesPicker customRecipes={customRecipes} onPick={(item) => onPick(item, 'meal')} />
      )}
      {tab === 'search' && (
        <WebAndLocalSearch discoveredProducts={discoveredProducts} onRecordDiscovered={onRecordDiscovered} onPick={(item) => onPick(item, 'side')} />
      )}
    </div>
  )
}

function SuggestedList({ remainingCalories, remainingProtein, personSettings, excludeIds, onPick }) {
  const sides = suggestSides({ remainingCalories, remainingProtein, personSettings, excludeIds })

  if (sides.length === 0) {
    return <p className="muted small">No local suggestions fit right now — try the Search tab.</p>
  }

  return (
    <div>
      {sides.map(item => (
        <div className="meal-row" key={item.id} style={{ cursor: 'pointer' }} onClick={() => onPick(item)}>
          <div>
            <div className="meal-name">{item.name}</div>
            <div className="meal-type">P{item.protein}g · C{item.carbs}g · F{item.fat}g</div>
          </div>
          <span className="meal-macros">{item.calories} kcal</span>
        </div>
      ))}
    </div>
  )
}

// Lets you add one of your own saved recipes to this day, with the
// recommended serving size shown in grams and a direct gram adjuster —
// scale it up or down to exactly what you're actually eating, not just
// whole servings.
function MyRecipesPicker({ customRecipes, onPick }) {
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(0)

  if (!customRecipes || customRecipes.length === 0) {
    return <p className="muted small">No saved recipes yet. Build one from the Pantry tab's "My Recipe" mode.</p>
  }

  if (selected) {
    const scaled = scaleItemToGrams(selected, Number(grams) || 0)
    return (
      <div>
        <p className="meal-name" style={{ marginBottom: 2 }}>{selected.name}</p>
        <p className="muted small" style={{ marginBottom: 10 }}>Recommended: {selected.servingWeightG}g per serving</p>
        <div className="field">
          <label>Amount (grams)</label>
          <input type="number" value={grams} onChange={e => { const v = e.target.value; setGrams(v === '' ? '' : Number(v)) }} />
        </div>
        <p className="mono small" style={{ marginBottom: 12 }}>
          {scaled.calories} kcal · P{scaled.protein}g · C{scaled.carbs}g · F{scaled.fat}g
        </p>
        <button className="primary" style={{ marginBottom: 8 }} onClick={() => onPick(scaled)}>Add this</button>
        <button className="secondary" style={{ width: '100%' }} onClick={() => setSelected(null)}>Back</button>
      </div>
    )
  }

  return (
    <div>
      {customRecipes.map(r => (
        <div className="meal-row" key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(r); setGrams(r.servingWeightG || 100) }}>
          <div>
            <div className="meal-name">{r.name}</div>
            <div className="meal-type">{r.type} · ≈{r.servingWeightG}g/serving</div>
          </div>
          <span className="meal-macros">{r.calories} kcal</span>
        </div>
      ))}
    </div>
  )
}

function WebAndLocalSearch({ discoveredProducts, onRecordDiscovered, onPick }) {
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
      const food = await getProductByBarcode(code)
      selectFood(food)
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
          Add this
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Great Value peanut butter" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && searchWeb()} />
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
