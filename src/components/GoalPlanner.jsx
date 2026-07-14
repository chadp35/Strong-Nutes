import React, { useMemo, useState } from 'react'
import { GOAL_TIMEFRAME_TIERS, buildGoalPlanTargets, recommendGoalPlanApproach } from '../lib/calculations.js'

const DEFAULT_DURATION_WEEKS = 12

// A self-contained goal-timeline picker. Used both in Onboarding (optional,
// skippable, feeding into the initial profile) and in Settings (to start,
// change, or stop a plan for someone who already has a profile). The parent
// owns persistence — this component just reports a confirmed selection.
//
// Leads with a recommended pace (computed from past-diet confidence,
// weight-loss-medication use, and body fat band, collected earlier in
// onboarding) rather than making someone type a target number before
// they've seen any guidance — picking a pace first and seeing what it gets
// you over a sensible default timeframe is a much lower-friction start, and
// both the duration and the resulting amount stay editable from there.
export default function GoalPlanner({
  weightLbs, weightKg, bmr, tdee, activePlan, onStart, onStop, onSkip,
  confidenceKey, weightLossDrugUse, bodyFatBand,
}) {
  const [type, setType] = useState(null) // 'lose' | 'gain'
  const [tab, setTab] = useState(null) // 'primary' | 'alternate' | 'custom'
  const [weeksStr, setWeeksStr] = useState(String(DEFAULT_DURATION_WEEKS))
  const [changeStr, setChangeStr] = useState('')
  const [customWeeksStr, setCustomWeeksStr] = useState('')
  const [customChangeStr, setCustomChangeStr] = useState('')
  const [editing, setEditing] = useState(!activePlan)

  const recommendation = useMemo(
    () => recommendGoalPlanApproach({ confidenceKey, weightLossDrugUse, bodyFatBand }),
    [confidenceKey, weightLossDrugUse, bodyFatBand]
  )

  const tiers = type ? GOAL_TIMEFRAME_TIERS[type] : []
  const primaryTierKey = recommendation.recommendedTierKey
  const alternateTierKey = primaryTierKey === 'gradual' ? 'moderate' : 'gradual'
  const primaryTier = tiers.find(t => t.key === primaryTierKey)
  const alternateTier = tiers.find(t => t.key === alternateTierKey)
  const activeTierKey = tab === 'primary' ? primaryTierKey : tab === 'alternate' ? alternateTierKey : null
  const activeTier = tab === 'primary' ? primaryTier : tab === 'alternate' ? alternateTier : null

  function paceFor(tierKey) {
    return tiers.find(t => t.key === tierKey)?.pctPerWeek || 0
  }

  function chooseType(t) {
    setType(t)
    const pace = GOAL_TIMEFRAME_TIERS[t].find(x => x.key === primaryTierKey)?.pctPerWeek || 0
    const lbs = weightLbs * pace * DEFAULT_DURATION_WEEKS
    setTab('primary')
    setWeeksStr(String(DEFAULT_DURATION_WEEKS))
    setChangeStr(lbs > 0 ? String(Math.round(lbs * 10) / 10) : '')
  }

  // Switching between the two named tabs keeps the duration constant and
  // recomputes the resulting amount at the new tab's pace — "same timeframe,
  // here's what each pace gets you" rather than resetting the whole form.
  function selectNamedTab(nextTab) {
    setTab(nextTab)
    const pace = paceFor(nextTab === 'primary' ? primaryTierKey : alternateTierKey)
    const w = Number(weeksStr) || DEFAULT_DURATION_WEEKS
    const lbs = weightLbs * pace * w
    setWeeksStr(String(w))
    setChangeStr(lbs > 0 ? String(Math.round(lbs * 10) / 10) : '')
  }

  function applyWeeks(v) {
    setWeeksStr(v)
    const w = Number(v) || 0
    const pace = paceFor(activeTierKey)
    const lbs = weightLbs * pace * w
    setChangeStr(lbs > 0 ? String(Math.round(lbs * 10) / 10) : '')
  }

  function applyChange(v) {
    setChangeStr(v)
    const lbs = Number(v) || 0
    const pace = paceFor(activeTierKey)
    const weeklyLbs = weightLbs * pace
    const weeks = weeklyLbs > 0 && lbs > 0 ? Math.max(1, Math.round(lbs / weeklyLbs)) : ''
    setWeeksStr(weeks ? String(weeks) : '')
  }

  const chosenWeeks = tab === 'custom' ? Number(customWeeksStr) || 0 : Number(weeksStr) || 0
  const chosenChangeLbs = tab === 'custom' ? Number(customChangeStr) || 0 : Number(changeStr) || 0

  const preview = useMemo(() => {
    if (!type || chosenChangeLbs <= 0 || chosenWeeks <= 0) return null
    return buildGoalPlanTargets({ type, targetChangeLbs: chosenChangeLbs, weeks: chosenWeeks, bmr, tdee, weightKg, weightLbs, bodyFatBand })
  }, [type, chosenChangeLbs, chosenWeeks, bmr, tdee, weightKg, weightLbs, bodyFatBand])

  function confirm() {
    if (!preview || !type) return
    const tierKeyForRecord = tab === 'custom' ? 'custom' : activeTierKey
    onStart({
      goalPlanCore: { type, targetChangeLbs: chosenChangeLbs, weeks: chosenWeeks, tierKey: tierKeyForRecord },
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
          <button className="secondary" style={{ flex: 1 }} onClick={() => chooseType('lose')}>Lose weight</button>
          <button className="secondary" style={{ flex: 1 }} onClick={() => chooseType('gain')}>Gain weight</button>
        </div>
        {(activePlan || onSkip) && (
          <button className="secondary" style={{ width: '100%' }} onClick={() => (activePlan ? setEditing(false) : onSkip())}>
            {activePlan ? 'Cancel' : "Skip — I'll use a flat target"}
          </button>
        )}
      </div>
    )
  }

  // ---------- Step 2: pace, amount, timeframe, preview ----------
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <TabButton active={tab === 'primary'} onClick={() => selectNamedTab('primary')}>
          ⭐ Highest success
        </TabButton>
        <TabButton active={tab === 'alternate'} onClick={() => selectNamedTab('alternate')}>
          {alternateTier?.label}
        </TabButton>
        <TabButton active={tab === 'custom'} onClick={() => setTab('custom')}>
          Custom
        </TabButton>
      </div>

      {tab !== 'custom' && activeTier && (
        <p className="muted small" style={{ marginBottom: 12 }}>
          {tab === 'primary' ? recommendation.note || primaryTier.blurb : activeTier.blurb}
        </p>
      )}

      {tab !== 'custom' ? (
        <div className="row field">
          <div>
            <label>Duration (weeks)</label>
            <input type="number" min={1} value={weeksStr} onChange={e => applyWeeks(e.target.value)} />
          </div>
          <div>
            <label>Target change (lbs)</label>
            <input type="number" min={0} value={changeStr} onChange={e => applyChange(e.target.value)} />
          </div>
        </div>
      ) : (
        <div className="row field">
          <div>
            <label>Duration (weeks)</label>
            <input type="number" min={1} value={customWeeksStr} onChange={e => setCustomWeeksStr(e.target.value)} placeholder="12" />
          </div>
          <div>
            <label>Target change (lbs)</label>
            <input type="number" min={0} value={customChangeStr} onChange={e => setCustomChangeStr(e.target.value)} placeholder="10" />
          </div>
        </div>
      )}

      {preview && (
        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 12 }}>
          <p className="mono" style={{ marginBottom: 6 }}>
            {preview.calories} kcal/day <span className="muted small">({preview.dailyCalorieChange > 0 ? '+' : ''}{preview.dailyCalorieChange} vs. maintenance)</span>
          </p>
          <p className="muted small" style={{ marginBottom: preview.isAggressive ? 8 : 0 }}>
            ~{preview.weeklyRateLbs} lb/week · Flexible range: {preview.calories - preview.wiggleRoom}–{preview.calories + preview.wiggleRoom} kcal — what matters is the weekly average, not perfection every day.
          </p>
          {preview.isAggressive && (
            <p className="small" style={{ color: 'var(--danger)', marginBottom: 0 }}>
              Heads up — this pace ({preview.weeklyRateLbs} lb/week) is more aggressive than generally recommended. It's harder to sustain and raises the risk of losing muscle (or gaining more fat, if bulking). A longer timeframe is usually worth it.
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="primary" disabled={!preview} style={{ flex: 1, opacity: preview ? 1 : 0.5 }} onClick={confirm}>
          {activePlan ? 'Update plan' : 'Start this plan'}
        </button>
        <button className="secondary" onClick={() => { setType(null); setTab(null); setChangeStr(''); setCustomWeeksStr(''); setCustomChangeStr('') }}>Back</button>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      className="secondary"
      style={{
        flex: 1, fontWeight: 700, fontSize: 13, padding: '10px 6px',
        background: active ? 'var(--fuel)' : 'var(--surface-2)',
        color: active ? 'var(--on-fuel)' : 'var(--text)',
        borderColor: active ? 'var(--fuel)' : 'var(--border)',
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
