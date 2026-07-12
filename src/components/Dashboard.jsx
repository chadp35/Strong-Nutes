import React, { useState } from 'react'
import Gauge from './Gauge.jsx'
import AddFoodPanel from './AddFoodPanel.jsx'

export default function Dashboard({
  profile, todaysEntries, onAddEntry, onRemoveEntry, todaysPlanMeals,
  customFoods, onSaveCustomFood, onDeleteCustomFood, customRecipes,
  todaysWater, onChangeWater,
}) {
  const [showAdd, setShowAdd] = useState(false)
  const WATER_TARGET_CUPS = 8

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
        {profile.goalPlan && (
          <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
            {profile.goalPlan.type === 'lose' ? 'Losing' : 'Gaining'} toward {profile.goalPlan.targetChangeLbs} lbs ·
            {' '}flexible range {t.calories - profile.goalPlan.wiggleRoom}–{t.calories + profile.goalPlan.wiggleRoom} kcal
          </p>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ marginBottom: 0 }}>💧 Water</h2>
          <span className="mono small muted">{todaysWater} / {WATER_TARGET_CUPS} cups</span>
        </div>
        <div className="gauge-track" style={{ marginBottom: 14 }}>
          <div
            className="gauge-fill"
            style={{ width: `${Math.min((todaysWater / WATER_TARGET_CUPS) * 100, 100)}%`, background: 'var(--carb)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" style={{ flex: 1 }} onClick={() => onChangeWater(-1)} disabled={todaysWater <= 0}>− 1 cup</button>
          <button className="secondary" style={{ flex: 1 }} onClick={() => onChangeWater(1)}>+ 1 cup</button>
        </div>
      </div>

      {todaysPlanMeals?.length > 0 && (
        <div className="card">
          <h2>Today's plan</h2>
          {todaysPlanMeals.map(meal => (
            <div className="meal-row" key={meal.id}>
              <div>
                <div className="meal-name">{meal.name}</div>
                <div className="meal-type">
                  {meal.slotLabel || meal.type}
                </div>
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
          <AddFoodPanel
            customFoods={customFoods}
            customRecipes={customRecipes}
            onAddEntry={onAddEntry}
            onSaveCustomFood={onSaveCustomFood}
            onDeleteCustomFood={onDeleteCustomFood}
            onDone={() => setShowAdd(false)}
          />
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
