import React, { Suspense, useState, lazy } from 'react'
import { suggestSides } from '../lib/mealPlanner.js'
import { searchBrandedFoods, macrosForGrams, getProductByBarcode } from '../lib/openFoodFacts.js'

const BarcodeScanner = lazy(() => import('./BarcodeScanner.jsx'))

export default function AddExtraPanel({ remainingCalories, remainingProtein, personSettings, excludeIds, onPick }) {
  const [tab, setTab] = useState('suggested')

  return (
    <div className="card" style={{ background: 'var(--surface-2)', marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          className="secondary"
          style={{
            flex: 1, fontWeight: 700,
            background: tab === 'suggested' ? 'var(--fuel)' : 'var(--surface)',
            color: tab === 'suggested' ? '#12140f' : 'var(--text)',
          }}
          onClick={() => setTab('suggested')}
        >
          Suggested
        </button>
        <button
          className="secondary"
          style={{
            flex: 1, fontWeight: 700,
            background: tab === 'web' ? 'var(--fuel)' : 'var(--surface)',
            color: tab === 'web' ? '#12140f' : 'var(--text)',
          }}
          onClick={() => setTab('web')}
        >
          Search the web
        </button>
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
      {tab === 'web' && <WebSearch onPick={(item) => onPick(item, 'side')} />}
    </div>
  )
}

function SuggestedList({ remainingCalories, remainingProtein, personSettings, excludeIds, onPick }) {
  const sides = suggestSides({ remainingCalories, remainingProtein, personSettings, excludeIds })

  if (sides.length === 0) {
    return <p className="muted small">No local suggestions fit right now — try the web search tab.</p>
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

function WebSearch({ onPick }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [scanning, setScanning] = useState(false)

  async function search() {
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    try {
      setResults(await searchBrandedFoods(query))
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
    return (
      <Suspense fallback={<p className="muted small">Loading scanner…</p>}>
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
      </Suspense>
    )
  }

  if (selected) {
    const macros = macrosForGrams(selected, grams)
    return (
      <div>
        <p className="meal-name" style={{ marginBottom: 2 }}>{selected.name}</p>
        {selected.brand && <p className="muted small" style={{ marginBottom: 10 }}>{selected.brand}</p>}
        <div className="field">
          <label>Amount (grams)</label>
          <input type="number" value={grams} onChange={e => setGrams(Number(e.target.value) || 0)} />
        </div>
        <p className="mono small" style={{ marginBottom: 12 }}>
          {macros.calories} kcal · P{macros.protein}g · C{macros.carbs}g · F{macros.fat}g
        </p>
        <button
          className="primary"
          onClick={() => onPick({
            id: `web-${selected.id}-${Date.now()}`,
            name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
            ...macros,
            recipe: 'Added from a web search — check the label for the exact serving.',
            ingredients: [],
          })}
        >
          Add this
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. granola bar" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && search()} />
        <button className="secondary" onClick={search}>Search</button>
        <button className="secondary" onClick={() => setScanning(true)}>📷</button>
      </div>
      {loading && <p className="muted small">{query ? 'Searching…' : 'Looking up barcode…'}</p>}
      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
      {results.map(food => (
        <div className="meal-row" style={{ cursor: 'pointer' }} key={food.id} onClick={() => selectFood(food)}>
          <div>
            <div className="meal-name">{food.name}</div>
            <div className="meal-type">{food.brand || 'Branded food'}</div>
          </div>
          <span className="meal-macros">{food.caloriesPer100g} kcal/100g</span>
        </div>
      ))}
      <p className="muted small" style={{ marginTop: 10 }}>
        Via Open Food Facts — useful when the local list is a little short on options. Always worth a quick label check.
      </p>
    </div>
  )
}
