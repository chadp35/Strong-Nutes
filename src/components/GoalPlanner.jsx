import React, { useMemo, useState } from 'react'
import { suggestGoalTimeframes, buildGoalPlanTargets } from '../lib/calculations.js'

// A self-contained goal-timeline picker. Used both in Onboarding (optional,
// skippable, feeding into the initial profile) and in Settings (to start,
// change, or stop a plan for someone who already has a profile). The parent
// owns persistence — this component just reports a confirmed selection.
export default function GoalPlanner({ weightLbs, weightKg, bmr, tdee, activePlan, onStart, onStop, onSkip }) {
  const [type, setType] = useState(null) // 'lose' | 'gain'
  const [targetChangeLbs, setTargetChangeLbs] = useState('')
  const [selectedTier, setSelectedTier] = useState(null) // tier key or 'custom'
  const [customWeeks, setCustomWeeks] = useState('')
  const [editing, setEditing] = useState(!activePlan)

  const changeLbs = Number(targetChangeLbs) || 0

  const tiers = useMemo(() => {
    if (!type || changeLbs <= 0) return []
    return suggestGoalTimeframes({ type, targetChangeLbs: changeLbs, weightLbs })
  }, [type, changeLbs, weightLbs])

  const chosenWeeks = selectedTier === 'custom'
    ? Number(customWeeks) || 0
    : tiers.find(t => t.key === selectedTier)?.weeks || 0

  const preview = useMemo(() => {
    if (!type || changeLbs <= 0 || chosenWeeks <= 0) return null
    return buildGoalPlanTargets({ type, targetChangeLbs: changeLbs, weeks: chosenWeeks, bmr, tdee, weightKg, weightLbs })
  }, [type, changeLbs, chosenWeeks, bmr, tdee, weightKg, weightLbs])

  function confirm() {
    if (!preview || !type) return
    onStart({
      goalPlanCore: { type, targetChangeLbs: changeLbs, weeks: chosenWeeks, tierKey: selectedTier },
      preview,
    })
    setEditing(false)
  }

  // ---------- Active plan summary (Settings context) ----------
  if (activePlan && !editing) {
    const verb = activePlan.type === 'lose' ? 'Lose' : 'Gain'
    return (
      <div>
        <p className="small" style={{ marginBottom: 6 }}>
          <strong>{verb} {activePlan.targetChangeLbs} lbs</strong> over {activePlan.weeks} weeks
          {' '}(~{activePlan.weeklyRateLbs} lb/week)
        </p>
        <p className="mono small muted" style={{ marginBottom: 12 }}>
          Daily target adjusted by {activePlan.dailyCalorieChange > 0 ? '+' : ''}{activePlan.dailyCalorieChange} kcal ·
          {' '}flexible range ±{activePlan.wiggleRoom} kcal
        </p>
        {activePlan.isAggressive && (
          <p className="small" style={{ color: 'var(--danger)', marginBottom: 12 }}>
            This is a faster pace than generally recommended — harder to sustain and more likely to cost muscle. Consider a longer timeframe if it feels unsustainable.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={() => setEditing(true)}>Change goal</button>
          <button className="secondary" style={{ color: 'var(--danger)' }} onClick={onStop}>Stop plan</button>
        </div>
      </div>
    )
  }

  // ---------- Step 1: direction ----------
  if (!type) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className="secondary" style={{ flex: 1 }} onClick={() => setType('lose')}>Lose weight</button>
          <button className="secondary" style={{ flex: 1 }} onClick={() => setType('gain')}>Gain weight</button>
        </div>
        {(activePlan || onSkip) && (
          <button className="secondary" style={{ width: '100%' }} onClick={() => (activePlan ? setEditing(false) : onSkip())}>
            {activePlan ? 'Cancel' : "Skip — I'll use a flat target"}
          </button>
        )}
      </div>
    )
  }

  // ---------- Step 2+3: amount, timeframe, preview ----------
  return (
    <div>
      <div className="field">
        <label>How many lbs do you want to {type}?</label>
        <input
          type="number" min={1} value={targetChangeLbs}
          onChange={e => { setTargetChangeLbs(e.target.value); setSelectedTier(null) }}
          placeholder="10"
        />
        {targetChangeLbs !== '' && changeLbs <= 0 && (
          <p className="small" style={{ color: 'var(--danger)', marginTop: 6, marginBottom: 0 }}>
            Enter a number greater than 0.
          </p>
        )}
      </div>

      {tiers.length > 0 && (
        <>
          <label style={{ marginBottom: 8 }}>Choose a pace</label>
          {tiers.map(t => (
            <div
              key={t.key}
              className={`tag-chip ${selectedTier === t.key ? 'like' : ''}`}
              style={{ display: 'block', marginBottom: 8, borderRadius: 10, padding: '10px 14px' }}
              onClick={() => setSelectedTier(t.key)}
            >
              <strong>{t.label}</strong> — {t.weeks} weeks (~{t.weeklyLbs} lb/week)
              <div className="muted small">{t.blurb}</div>
            </div>
          ))}
          <div
            className={`tag-chip ${selectedTier === 'custom' ? 'like' : ''}`}
            style={{ display: 'block', marginBottom: 12, borderRadius: 10, padding: '10px 14px' }}
            onClick={() => setSelectedTier('custom')}
          >
            <strong>Custom timeframe</strong>
            {selectedTier === 'custom' && (
              <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                <input
                  type="number" min={1} value={customWeeks}
                  onChange={e => setCustomWeeks(e.target.value)}
                  placeholder="Weeks"
                  style={{ maxWidth: 120 }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {preview && (
        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 12 }}>
          <p className="mono" style={{ marginBottom: 6 }}>
            {preview.calories} kcal/day <span className="muted small">({preview.dailyCalorieChange > 0 ? '+' : ''}{preview.dailyCalorieChange} vs. maintenance)</span>
          </p>
          <p className="muted small" style={{ marginBottom: preview.isAggressive ? 8 : 0 }}>
            Flexible range: {preview.calories - preview.wiggleRoom}–{preview.calories + preview.wiggleRoom} kcal — what matters is the weekly average, not perfection every day.
          </p>
          {preview.isAggressive && (
            <p className="small" style={{ color: 'var(--danger)', marginBottom: 0 }}>
              Heads up — this pace ({preview.weeklyRateLbs} lb/week) is more aggressive than generally recommended. It's harder to sustain and raises the risk of losing muscle (or gaining more fat, if bulking). A longer timeframe is usually worth it.
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" disabled={!preview} style={{ opacity: preview ? 1 : 0.5 }} onClick={confirm}>
          {activePlan ? 'Update plan' : 'Start this plan'}
        </button>
        <button className="secondary" onClick={() => { setType(null); setSelectedTier(null); setTargetChangeLbs('') }}>Back</button>
      </div>
    </div>
  )
}
