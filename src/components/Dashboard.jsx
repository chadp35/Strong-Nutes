import React, { useState } from 'react'
import Gauge from './Gauge.jsx'
import AddFoodPanel, { guessMealSlot } from './AddFoodPanel.jsx'
import MealSwapPanel from './MealSwapPanel.jsx'
import { scaleItemToGrams } from '../lib/mealPlanner.js'

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Time-of-day, date-aware greeting — a light bit of orientation/grounding at
// the top of the day's main screen rather than dropping straight into
// numbers, and it doesn't need a "name" field the app never actually collects.
function greeting(now) {
  const hour = now.getHours()
  if (hour < 5) return 'Still up?'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Winding down'
}

function todayLabel(now) {
  return `${WEEKDAY_NAMES[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Dashboard({
  profile, todaysEntries, onAddEntry, onRemoveEntry, onEditEntry,
  todaysPlanDay, onReplaceMeal, onRegenerateMeal, onSwapMeal, onRemoveMeal,
  savedPantry, personSettings,
  customFoods, onSaveCustomFood, onDeleteCustomFood, customRecipes,
  discoveredProducts, onRecordDiscovered,
  todaysWater, onChangeWater,
}) {
  const [showAdd, setShowAdd] = useState(false)
  const WATER_TARGET_CUPS = 8
  const now = new Date()

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
      mealSlot: meal.type,
      servingWeightG: meal.servingWeightG,
    })
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, marginBottom: 2 }}>{greeting(now)}</h1>
        <p className="muted small" style={{ marginBottom: 0 }}>{todayLabel(now)} — here's where you stand.</p>
      </div>

      <div className="card">
        <h2>Today's fuel</h2>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 18 }}>
          <span className="odometer" style={{ color: totals.calories > t.calories ? 'var(--danger)' : 'var(--fuel)' }}>
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

      {todaysPlanDay?.meals?.length > 0 && (
        <div className="card">
          <h2>Today's plan</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Tap a meal to swap it, regenerate it, or log a different amount than planned.
          </p>
          {todaysPlanDay.meals.map((meal, index) => (
            <TodaysPlanRow
              key={`${meal.id}-${index}`}
              day={todaysPlanDay}
              meal={meal}
              index={index}
              onQuickLog={quickLogMeal}
              onLogScaled={onAddEntry}
              onReplaceMeal={onReplaceMeal}
              onRegenerateMeal={onRegenerateMeal}
              onSwapMeal={onSwapMeal}
              onRemoveMeal={onRemoveMeal}
              personSettings={personSettings}
              savedPantry={savedPantry}
              customRecipes={customRecipes}
              discoveredProducts={discoveredProducts}
              onRecordDiscovered={onRecordDiscovered}
            />
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
            discoveredProducts={discoveredProducts}
            onRecordDiscovered={onRecordDiscovered}
            onAddEntry={onAddEntry}
            onSaveCustomFood={onSaveCustomFood}
            onDeleteCustomFood={onDeleteCustomFood}
            onDone={() => setShowAdd(false)}
            defaultMealSlot={guessMealSlot(now)}
          />
        )}

        {todaysEntries.length === 0 && !showAdd && (
          <p className="muted small">Nothing logged yet today.</p>
        )}
        {todaysEntries.map(e => (
          <LoggedEntryRow key={e.id} entry={e} onRemove={onRemoveEntry} onEdit={onEditEntry} />
        ))}
      </div>
    </div>
  )
}

const MEAL_SLOT_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

// One row in the Today tab's log — tap to expand a portion slider that
// rescales calories/protein/carbs/fat against the entry's original logged
// amount (its base* snapshot), so it's never a one-shot "locked in" number.
function LoggedEntryRow({ entry, onRemove, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const hasBase = entry.baseCalories != null
  const [portion, setPortion] = useState(entry.portion ?? 100)

  function applyPortion(pct) {
    setPortion(pct)
    if (!hasBase) return
    onEdit(entry.id, {
      portion: pct,
      calories: Math.round((entry.baseCalories * pct) / 100),
      protein: Math.round(((entry.baseProtein || 0) * pct) / 100 * 10) / 10,
      carbs: Math.round(((entry.baseCarbs || 0) * pct) / 100 * 10) / 10,
      fat: Math.round(((entry.baseFat || 0) * pct) / 100 * 10) / 10,
    })
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="log-entry" style={{ borderBottom: 'none', cursor: 'pointer' }} onClick={() => setExpanded(x => !x)}>
        <div>
          <div className="meal-name">{entry.name}</div>
          <div className="meal-macros">
            {entry.calories} kcal · P{entry.protein} C{entry.carbs} F{entry.fat}
            {entry.mealSlot && MEAL_SLOT_LABELS[entry.mealSlot] ? ` · ${MEAL_SLOT_LABELS[entry.mealSlot]}` : ''}
            {formatTime(entry.loggedAt) ? ` · ${formatTime(entry.loggedAt)}` : ''}
          </div>
        </div>
        <button className="remove-btn" onClick={e => { e.stopPropagation(); onRemove(entry.id) }}>×</button>
      </div>

      {expanded && (
        <div style={{ padding: '0 0 14px' }}>
          {hasBase ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ marginBottom: 0 }}>Portion actually eaten</label>
                <span className="mono small">{portion}%</span>
              </div>
              <input
                type="range" min={25} max={200} step={5}
                value={portion}
                onChange={e => applyPortion(Number(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[50, 75, 100, 125, 150].map(p => (
                  <button
                    key={p}
                    className="secondary"
                    style={{
                      flex: 1, fontSize: 12, padding: '6px 4px',
                      background: portion === p ? 'var(--fuel)' : 'var(--surface-2)',
                      color: portion === p ? 'var(--on-fuel)' : 'var(--text)',
                    }}
                    onClick={() => applyPortion(p)}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="muted small">
              This item was logged before portion adjusting existed, so there's no original amount to scale against — remove and re-log it to unlock this.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// One meal in Today's plan card — mirrors the Plan tab's per-meal controls
// (regenerate/swap/remove) plus a "how much are you actually having"
// gram-based adjuster on the way into the log, instead of only ever being
// able to log the plan's exact stated serving.
function TodaysPlanRow({
  day, meal, index, onQuickLog, onLogScaled, onReplaceMeal, onRegenerateMeal, onSwapMeal, onRemoveMeal,
  personSettings, savedPantry, customRecipes, discoveredProducts, onRecordDiscovered,
}) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState(null) // null | 'swap' | 'adjust'
  const [grams, setGrams] = useState(meal.servingWeightG || 0)

  const coreMeals = day.meals.filter(m => m.isCore)
  const isCore = !!meal.isCore

  function confirmAdjustedLog() {
    const scaled = scaleItemToGrams(meal, Number(grams) || 0)
    onLogScaled({
      id: Date.now().toString(),
      name: meal.name,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      mealSlot: meal.type,
      servingWeightG: Number(grams) || 0,
    })
    setMode(null)
    setExpanded(false)
  }

  return (
    <div>
      <div className="meal-row" style={{ cursor: 'pointer' }} onClick={() => setExpanded(x => !x)}>
        <div>
          <div className="meal-name">{meal.name}</div>
          <div className="meal-type">{meal.slotLabel || meal.type}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="meal-macros">{meal.calories} kcal</span>
          <button className="secondary" onClick={e => { e.stopPropagation(); onQuickLog(meal) }}>Log it</button>
        </div>
      </div>

      {expanded && (
        <div className="meal-detail">
          <div style={{ display: 'flex', gap: 8, margin: '8px 0 12px', flexWrap: 'wrap' }}>
            {isCore && (
              <button className="secondary" onClick={() => { onRegenerateMeal(day.day, index); setMode(null) }}>
                🔄 Regenerate
              </button>
            )}
            <button className="secondary" onClick={() => setMode(mode === 'swap' ? null : 'swap')}>
              🔁 {mode === 'swap' ? 'Cancel change' : 'Change this meal'}
            </button>
            <button className="secondary" onClick={() => setMode(mode === 'adjust' ? null : 'adjust')}>
              ⚖️ {mode === 'adjust' ? 'Cancel' : 'Adjust & log amount'}
            </button>
            {(!isCore || coreMeals.length > 1) && (
              <button className="secondary" style={{ color: 'var(--danger)' }} onClick={() => { onRemoveMeal(day.day, index); setExpanded(false) }}>
                Remove
              </button>
            )}
          </div>

          {mode === 'swap' && (
            <MealSwapPanel
              mealType={isCore ? meal.type : 'any'}
              excludeIds={day.meals.map(m => m.id)}
              personSettings={personSettings}
              customRecipes={customRecipes}
              savedPantry={savedPantry}
              discoveredProducts={discoveredProducts}
              onRecordDiscovered={onRecordDiscovered}
              onPick={(item, kind) => {
                if (isCore) onSwapMeal(day.day, index, item)
                else onReplaceMeal(day.day, index, item, kind)
                setMode(null)
              }}
              onCancel={() => setMode(null)}
            />
          )}

          {mode === 'adjust' && (
            <div>
              <div className="field">
                <label>Amount you're having (grams)</label>
                <input
                  type="number" value={grams}
                  onChange={e => { const v = e.target.value; setGrams(v === '' ? '' : Number(v)) }}
                  placeholder={`~${meal.servingWeightG || 0}g planned serving`}
                />
              </div>
              <p className="mono small" style={{ marginBottom: 10 }}>
                {scaleItemToGrams(meal, Number(grams) || 0).calories} kcal · P{scaleItemToGrams(meal, Number(grams) || 0).protein}g ·
                {' '}C{scaleItemToGrams(meal, Number(grams) || 0).carbs}g · F{scaleItemToGrams(meal, Number(grams) || 0).fat}g
              </p>
              <button className="primary" onClick={confirmAdjustedLog}>Log this amount</button>
            </div>
          )}

          {!mode && (
            <>
              <strong>{isCore ? 'Recipe' : 'How to eat it'}:</strong> {meal.recipe}
              <br />
              <span className="mono">P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g per serving</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
