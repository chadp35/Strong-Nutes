import React, { useState } from 'react'
import Gauge from './Gauge.jsx'

export default function Dashboard({ profile, todaysEntries, onAddEntry, onRemoveEntry, todaysPlanMeals }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' })

  const totals = todaysEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const t = profile.targets

  function submitAdd() {
    if (!form.name || !form.calories) return
    onAddEntry({
      id: Date.now().toString(),
      name: form.name,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    })
    setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' })
    setShowAdd(false)
  }

  function quickLogMeal(meal) {
    onAddEntry({
      id: Date.now().toString(),
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    })
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div className="card">
        <h2>Today's fuel</h2>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <span className="odometer" style={{ color: totals.calories > t.calories ? '#e85f5f' : 'var(--fuel)' }}>
            {Math.round(totals.calories)}
          </span>
          <span className="odometer-unit">/ {t.calories} kcal</span>
        </div>
        <Gauge label="Protein" value={totals.protein} target={t.protein} color="var(--protein)" />
        <Gauge label="Carbs" value={totals.carbs} target={t.carbs} color="var(--carb)" />
        <Gauge label="Fat" value={totals.fat} target={t.fat} color="var(--fat)" />
      </div>

      {todaysPlanMeals?.length > 0 && (
        <div className="card">
          <h2>Today's plan</h2>
          {todaysPlanMeals.map(meal => (
            <div className="meal-row" key={meal.id}>
              <div>
                <div className="meal-name">{meal.name}</div>
                <div className="meal-type">{meal.type}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="meal-macros">{meal.calories} kcal</span>
                <button className="secondary" onClick={() => quickLogMeal(meal)}>Log it</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ marginBottom: 0 }}>Logged today</h2>
          <button className="secondary" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Cancel' : '+ Add food'}</button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 16 }}>
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
            <button className="primary" onClick={submitAdd}>Add to log</button>
          </div>
        )}

        {todaysEntries.length === 0 && !showAdd && (
          <p className="muted small">Nothing logged yet today.</p>
        )}
        {todaysEntries.map(e => (
          <div className="log-entry" key={e.id}>
            <div>
              <div className="meal-name">{e.name}</div>
              <div className="meal-macros">{e.calories} kcal · P{e.protein} C{e.carbs} F{e.fat}</div>
            </div>
            <button className="remove-btn" onClick={() => onRemoveEntry(e.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
