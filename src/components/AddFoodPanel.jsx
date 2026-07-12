import React, { useEffect, useRef, useState } from 'react'
import { searchBrandedFoods, macrosForGrams } from '../lib/openFoodFacts.js'

const SUBTABS = [
  { key: 'search', label: 'Search' },
  { key: 'mine', label: 'My Foods' },
  { key: 'manual', label: 'Manual' },
]

export default function AddFoodPanel({ customFoods, onAddEntry, onSaveCustomFood, onDeleteCustomFood, onDone }) {
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
        <MyFoods customFoods={customFoods} onAddEntry={onAddEntry} onDeleteCustomFood={onDeleteCustomFood} onDone={onDone} />
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

  return (
    <div>
      <div className="field">
        <label>Search branded foods</label>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. brown sugar cinnamon pop-tarts"
        />
      </div>
      {loading && <p className="muted small">Searching…</p>}
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

function MyFoods({ customFoods, onAddEntry, onDeleteCustomFood, onDone }) {
  if (!customFoods || customFoods.length === 0) {
    return <p className="muted small">Nothing saved yet. Save a food from Search or Manual entry to see it here.</p>
  }
  return (
    <div>
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
      <p className="muted small" style={{ marginTop: 10 }}>Tap a food to log it. Tap × to remove it from this list.</p>
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
