import React, { useState } from 'react'
import { AI_PROVIDERS } from '../lib/aiConfig.js'
import { analyzeFood, fileToBase64 } from '../lib/aiFoodScan.js'
import AIProviderSetup from './AIProviderSetup.jsx'

const MODES = [
  { key: 'photo', label: '📷 Photo' },
  { key: 'text', label: '✏️ Describe' },
]

export default function AIFoodScanner({ aiConfig, onSetAIConfig, onAddEntry, onDone }) {
  const [mode, setMode] = useState('photo')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState(null) // null until a scan returns results
  const [targetCalories, setTargetCalories] = useState('')

  // Only ever prompted here, the first time someone tries to use the
  // scanner — everywhere else this stays entirely out of the way.
  if (!aiConfig?.provider || !aiConfig?.apiKey) {
    return (
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>Set up the food scanner</h3>
        <AIProviderSetup onSave={cfg => onSetAIConfig(cfg)} />
      </div>
    )
  }

  function pickImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setItems(null)
    setError('')
  }

  async function runScan() {
    setError('')
    if (mode === 'photo' && !imageFile) { setError('Take or choose a photo first.'); return }
    if (mode === 'text' && !description.trim()) { setError('Describe what you ate first.'); return }

    setLoading(true)
    try {
      const imageBase64 = mode === 'photo' ? await fileToBase64(imageFile) : undefined
      const result = await analyzeFood({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        description: mode === 'text' ? description.trim() : undefined,
        imageBase64,
      })
      if (!result.items || result.items.length === 0) {
        setError("Couldn't identify any food in that — try a clearer photo or a more specific description.")
        setItems(null)
      } else {
        setItems(result.items.map((it, i) => ({ ...it, _id: i })))
      }
    } catch (err) {
      setError(err.message || 'The scan failed — try again.')
    } finally {
      setLoading(false)
    }
  }

  function updateItem(id, field, value) {
    setItems(list => list.map(it => (it._id === id ? { ...it, [field]: field === 'name' ? value : (Number(value) || 0) } : it)))
  }

  function removeItem(id) {
    setItems(list => list.filter(it => it._id !== id))
  }

  const totalCalories = items ? items.reduce((s, it) => s + (Number(it.calories) || 0), 0) : 0

  function applyTargetScale() {
    const target = Number(targetCalories)
    if (!target || !items || totalCalories <= 0) return
    const factor = target / totalCalories
    setItems(list => list.map(it => ({
      ...it,
      grams: Math.round((it.grams || 0) * factor),
      calories: Math.round((it.calories || 0) * factor),
      protein: Math.round((it.protein || 0) * factor * 10) / 10,
      carbs: Math.round((it.carbs || 0) * factor * 10) / 10,
      fat: Math.round((it.fat || 0) * factor * 10) / 10,
    })))
  }

  function startOver() {
    setItems(null)
    setImageFile(null)
    setImagePreview('')
    setDescription('')
    setTargetCalories('')
    setError('')
  }

  function logAll() {
    items.forEach((it, i) => {
      onAddEntry({
        id: `${Date.now()}-${i}`,
        name: it.name,
        calories: Math.round(it.calories) || 0,
        protein: Math.round((it.protein || 0) * 10) / 10,
        carbs: Math.round((it.carbs || 0) * 10) / 10,
        fat: Math.round((it.fat || 0) * 10) / 10,
      })
    })
    onDone?.()
  }

  return (
    <div>
      {!items && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {MODES.map(m => (
            <button
              key={m.key}
              className="secondary"
              style={{
                flex: 1, fontWeight: 700,
                background: mode === m.key ? 'var(--fuel)' : 'var(--surface-2)',
                color: mode === m.key ? 'var(--on-fuel)' : 'var(--text)',
                borderColor: mode === m.key ? 'var(--fuel)' : 'var(--border)',
              }}
              onClick={() => { setMode(m.key); setError('') }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {!items && mode === 'photo' && (
        <div className="field">
          <label>Photo of your meal</label>
          {imagePreview && (
            <img src={imagePreview} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 240, objectFit: 'cover' }} />
          )}
          <input type="file" accept="image/*" capture="environment" onChange={pickImage} />
        </div>
      )}

      {!items && mode === 'text' && (
        <div className="field">
          <label>What did you eat?</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="e.g. grilled chicken breast, a cup of white rice, steamed broccoli with a little butter"
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '11px 12px', borderRadius: 10, fontSize: 15,
              fontFamily: 'Inter', resize: 'vertical',
            }}
          />
        </div>
      )}

      {!items && (
        <button className="primary" style={{ width: '100%', marginBottom: 8 }} disabled={loading} onClick={runScan}>
          {loading ? 'Analyzing…' : `Analyze ${mode === 'photo' ? 'photo' : 'description'}`}
        </button>
      )}

      {error && <p className="small" style={{ color: 'var(--danger)', marginBottom: 10 }}>{error}</p>}

      {items && items.length > 0 && (
        <>
          <p className="muted small" style={{ marginBottom: 8 }}>
            AI estimates — check them against what you actually had before logging. Tap any field to fix it.
          </p>
          {items.map(it => (
            <div key={it._id} className="card" style={{ background: 'var(--surface-2)', marginBottom: 8, padding: 12 }}>
              <div className="field" style={{ marginBottom: 8 }}>
                <input value={it.name} onChange={e => updateItem(it._id, 'name', e.target.value)} style={{ fontWeight: 700 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <NumField label="grams" value={it.grams} onChange={v => updateItem(it._id, 'grams', v)} />
                <NumField label="kcal" value={it.calories} onChange={v => updateItem(it._id, 'calories', v)} />
                <NumField label="P" value={it.protein} onChange={v => updateItem(it._id, 'protein', v)} />
                <NumField label="C" value={it.carbs} onChange={v => updateItem(it._id, 'carbs', v)} />
                <NumField label="F" value={it.fat} onChange={v => updateItem(it._id, 'fat', v)} />
              </div>
              <button className="secondary" style={{ marginTop: 8, fontSize: 12, padding: '4px 10px' }} onClick={() => removeItem(it._id)}>Remove</button>
            </div>
          ))}

          <div className="field" style={{ marginTop: 4 }}>
            <label>Resize this whole meal to a calorie target (optional)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" value={targetCalories} onChange={e => setTargetCalories(e.target.value)}
                placeholder={`currently ${Math.round(totalCalories)}`} style={{ flex: 1 }}
              />
              <button className="secondary" onClick={applyTargetScale} disabled={!targetCalories}>Resize</button>
            </div>
          </div>

          <p className="mono small" style={{ marginBottom: 12 }}>Total: {Math.round(totalCalories)} kcal</p>

          <button className="primary" style={{ width: '100%', marginBottom: 8 }} onClick={logAll}>
            Log {items.length} item{items.length === 1 ? '' : 's'}
          </button>
          <button className="secondary" style={{ width: '100%' }} onClick={startOver}>Scan something else</button>
        </>
      )}

      <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
        Using {AI_PROVIDERS[aiConfig.provider]?.label}. Change your provider or key anytime from Settings.
      </p>
    </div>
  )
}

function NumField({ label, value, onChange }) {
  return (
    <div style={{ width: 68 }}>
      <label style={{ fontSize: 11, marginBottom: 2 }}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} style={{ padding: '6px 8px', fontSize: 13 }} />
    </div>
  )
}
