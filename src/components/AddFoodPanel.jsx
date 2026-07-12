import React, { Suspense, useEffect, useRef, useState, lazy } from 'react'
import { searchBrandedFoods, macrosForGrams, getProductByBarcode } from '../lib/openFoodFacts.js'

const BarcodeScanner = lazy(() => import('./BarcodeScanner.jsx'))

const SUBTABS = [
  { key: 'search', label: 'Search' },
  { key: 'mine', label: 'My Foods' },
  { key: 'manual', label: 'Manual' },
]

export default function AddFoodPanel({ customFoods, customRecipes, onAddEntry, onSaveCustomFood, onDeleteCustomFood, onDone }) {
  const [subtab, setSubtab] = useState('search')

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {SUBTABS.map(t => (
          <button
            key={t.key}
            className="secondary"
            style={{
              flex: 1,
              background: subtab === t.key ? 'var(--fuel)' : 'var(--surface-2)',
              color: subtab === t.key ? '#12140f' : 'var(--text)',
              borderColor: subtab === t.key ? 'var(--fuel)' : 'var(--border)',
              fontWeight: 700,
            }}
            onClick={() => setSubtab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subtab === 'search' && (
        <BrandedSearch onAddEntry={onAddEntry} onSaveCustomFood={onSaveCustomFood} onDone={onDone} />
      )}
      {subtab === 'mine' && (
        <MyFoods customFoods={customFoods} customRecipes={customRecipes} onAddEntry={onAddEntry} onDeleteCustomFood={onDeleteCustomFood} onDone={onDone} />
      )}
      {subtab === 'manual' && (
        <ManualEntry onAddEntry={onAddEntry} onSaveCustomFood={onSaveCustomFood} onDone={onDone} />
      )}
    </div>
  )
}

// ---------- Branded search (Open Food Facts) ----------

function BrandedSearch({ onAddEntry, onSaveCustomFood, onDone }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [scanning, setScanning] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const r = await searchBrandedFoods(query)
        setResults(r)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }, 450)
    return () => clearTimeout(debounceRef.current)
  }, [query])

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

  function logSelected(alsoSave) {
    const macros = macrosForGrams(selected, grams)
    const entry = {
      id: Date.now().toString(),
      name: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
      ...macros,
    }
    onAddEntry(entry)
    if (alsoSave) {
      onSaveCustomFood({ id: `custom-${Date.now()}`, name: entry.name, ...macros, servingLabel: `${grams}g` })
    }
    setSelected(null)
    setQuery('')
    setResults([])
    onDone?.()
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
          <p className="muted small" style={{ marginTop: 4 }}>Typical serving: {selected.servingLabel}</p>
        </div>
        <p className="mono small" style={{ marginBottom: 14 }}>
          {macros.calories} kcal · P{macros.protein}g · C{macros.carbs}g · F{macros.fat}g
        </p>
        <button className="primary" style={{ marginBottom: 8 }} onClick={() => logSelected(false)}>Add to log</button>
        <button className="secondary" style={{ width: '100%', marginBottom: 8 }} onClick={() => logSelected(true)}>
          Add to log &amp; save for next time
        </button>
        <button className="secondary" style={{ width: '100%' }} onClick={() => setSelected(null)}>Back to results</button>
      </div>
    )
  }

  if (scanning) {
    return (
      <Suspense fallback={<p className="muted small">Loading scanner…</p>}>
        <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
      </Suspense>
    )
  }

  return (
    <div>
      <div className="field">
        <label>Search branded foods</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. brown sugar cinnamon pop-tarts"
            style={{ flex: 1 }}
          />
          <button className="secondary" onClick={() => setScanning(true)}>📷 Scan</button>
        </div>
      </div>
      {loading && <p className="muted small">{query ? 'Searching…' : 'Looking up barcode…'}</p>}
      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="muted small">No matches. Try a shorter or more generic term.</p>
      )}
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
        Data from Open Food Facts, a free crowd-sourced database — double-check anything that looks off.
      </p>
    </div>
  )
}

// ---------- My Foods ----------

function MyFoods({ customFoods, customRecipes, onAddEntry, onDeleteCustomFood, onDone }) {
  const hasFoods = customFoods && customFoods.length > 0
  const hasRecipes = customRecipes && customRecipes.length > 0

  if (!hasFoods && !hasRecipes) {
    return <p className="muted small">Nothing saved yet. Save a food from Search or Manual entry, or build a recipe from the Pantry tab, to see it here.</p>
  }

  return (
    <div>
      {hasRecipes && (
        <>
          <p className="muted small" style={{ marginBottom: 6 }}>Your recipes</p>
          {customRecipes.map(recipe => (
            <div
              className="meal-row" key={recipe.id} style={{ cursor: 'pointer' }}
              onClick={() => { onAddEntry({ id: Date.now().toString(), name: recipe.name, calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat }); onDone?.() }}
            >
              <div>
                <div className="meal-name">{recipe.name}</div>
                <div className="meal-type">{recipe.type}</div>
              </div>
              <span className="meal-macros">{recipe.calories} kcal</span>
            </div>
          ))}
        </>
      )}
      {hasFoods && (
        <>
          <p className="muted small" style={{ marginTop: hasRecipes ? 14 : 0, marginBottom: 6 }}>Saved foods</p>
          {customFoods.map(food => (
            <div className="log-entry" key={food.id}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { onAddEntry({ ...food, id: Date.now().toString() }); onDone?.() }}>
                <div className="meal-name">{food.name}</div>
                <div className="meal-macros">
                  {food.calories} kcal · P{food.protein}g · C{food.carbs}g · F{food.fat}g
                  {food.servingLabel ? ` · ${food.servingLabel}` : ''}
                </div>
              </div>
              <button className="remove-btn" onClick={() => onDeleteCustomFood(food.id)}>×</button>
            </div>
          ))}
        </>
      )}
      <p className="muted small" style={{ marginTop: 10 }}>Tap to log. Recipes can be removed from Settings.</p>
    </div>
  )
}

// ---------- Manual entry ----------

function ManualEntry({ onAddEntry, onSaveCustomFood, onDone }) {
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })
  const [save, setSave] = useState(false)

  function submit() {
    if (!form.name || !form.calories) return
    const macros = {
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    }
    onAddEntry({ id: Date.now().toString(), name: form.name, ...macros })
    if (save) {
      onSaveCustomFood({ id: `custom-${Date.now()}`, name: form.name, ...macros })
    }
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
    setSave(false)
    onDone?.()
  }

  return (
    <div>
      <div className="field">
        <label>Food name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken sandwich" />
      </div>
      <div className="row field">
        <div>
          <label>Calories</label>
          <input type="number" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} placeholder="450" />
        </div>
        <div>
          <label>Protein (g)</label>
          <input type="number" value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} placeholder="30" />
        </div>
      </div>
      <div className="row field">
        <div>
          <label>Carbs (g)</label>
          <input type="number" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} placeholder="40" />
        </div>
        <div>
          <label>Fat (g)</label>
          <input type="number" value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} placeholder="15" />
        </div>
      </div>
      <div
        className="field"
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => setSave(s => !s)}
      >
        <div className={`checkbox ${save ? 'on' : ''}`}>{save ? '✓' : ''}</div>
        <label style={{ marginBottom: 0, cursor: 'pointer' }}>Save for next time</label>
      </div>
      <button className="primary" onClick={submit}>Add to log</button>
    </div>
  )
}
