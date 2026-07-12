import React, { useMemo, useState } from 'react'
import { calculateTargets, lbsToKg, ftInToCm, ACTIVITY_MULTIPLIERS, GOALS } from '../lib/calculations.js'
import { ALL_TAGS } from '../data/foods.js'
import GoalPlanner from './GoalPlanner.jsx'

// Reasonable placeholder stats so the live calculator has something to show
// the instant the screen loads, before the person has typed anything.
const PLACEHOLDER = { weightLbs: 170, feet: 5, inches: 8, age: 30 }

export default function Onboarding({ onComplete }) {
  const [sex, setSex] = useState('male')
  const [weightLbs, setWeightLbs] = useState('')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [age, setAge] = useState('')
  const [activityKey, setActivityKey] = useState('moderate')
  const [goalKey, setGoalKey] = useState('maintain')
  const [likedTags, setLikedTags] = useState([])
  const [dislikedTags, setDislikedTags] = useState([])
  const [goalPlanResult, setGoalPlanResult] = useState(null) // { goalPlanCore, preview } or null

  function toggleTag(tag, list, setList, otherList, setOther) {
    if (list.includes(tag)) {
      setList(list.filter(t => t !== tag))
    } else {
      setList([...list, tag])
      if (otherList.includes(tag)) setOther(otherList.filter(t => t !== tag))
    }
  }

  const canSubmit = weightLbs && feet !== '' && age
  const isRealStats = weightLbs !== '' && feet !== '' && age !== ''

  // Recalculates on every keystroke — falls back to placeholder stats for any
  // field not yet filled in, so the numbers below are always live, never blank.
  const liveTargets = useMemo(() => {
    const w = weightLbs !== '' ? Number(weightLbs) : PLACEHOLDER.weightLbs
    const f = feet !== '' ? Number(feet) : PLACEHOLDER.feet
    const i = inches !== '' ? Number(inches) : PLACEHOLDER.inches
    const a = age !== '' ? Number(age) : PLACEHOLDER.age
    const weightKg = lbsToKg(w)
    const heightCm = ftInToCm(f, i)
    return calculateTargets({ sex, weightKg, heightCm, age: a, activityKey, goalKey })
  }, [sex, weightLbs, feet, inches, age, activityKey, goalKey])

  function handleSubmit() {
    const weightKg = lbsToKg(Number(weightLbs))
    const heightCm = ftInToCm(Number(feet), Number(inches || 0))
    const baseTargets = calculateTargets({ sex, weightKg, heightCm, age: Number(age), activityKey, goalKey })

    let targets = baseTargets
    let goalPlan = null
    if (goalPlanResult) {
      const { goalPlanCore, preview } = goalPlanResult
      targets = { bmr: preview.bmr, tdee: preview.tdee, calories: preview.calories, protein: preview.protein, carbs: preview.carbs, fat: preview.fat }
      goalPlan = {
        status: 'active',
        type: goalPlanCore.type,
        targetChangeLbs: goalPlanCore.targetChangeLbs,
        weeks: goalPlanCore.weeks,
        tierKey: goalPlanCore.tierKey,
        startDate: new Date().toISOString().slice(0, 10),
        dailyCalorieChange: preview.dailyCalorieChange,
        wiggleRoom: preview.wiggleRoom,
        weeklyRateLbs: preview.weeklyRateLbs,
        isAggressive: preview.isAggressive,
      }
    }

    onComplete({
      sex, weightKg, heightCm, age: Number(age), activityKey, goalKey,
      likedTags, dislikedTags, targets, goalPlan,
    })
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Let's set your targets</h1>
      <p className="muted small" style={{ marginBottom: 20 }}>
        Takes about a minute. You can change this anytime in Settings.
      </p>

      <div className="card">
        <h2>About you</h2>
        <div className="field">
          <label>Sex (for BMR calculation)</label>
          <select value={sex} onChange={e => setSex(e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div className="row field">
          <div>
            <label>Weight (lbs)</label>
            <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="180" />
          </div>
          <div>
            <label>Age</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="30" />
          </div>
        </div>
        <div className="row field">
          <div>
            <label>Height (ft)</label>
            <input type="number" value={feet} onChange={e => setFeet(e.target.value)} placeholder="5" />
          </div>
          <div>
            <label>Height (in)</label>
            <input type="number" value={inches} onChange={e => setInches(e.target.value)} placeholder="10" />
          </div>
        </div>
        <div className="field">
          <label>Activity level</label>
          <select value={activityKey} onChange={e => setActivityKey(e.target.value)}>
            {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Goal</label>
          <select value={goalKey} onChange={e => setGoalKey(e.target.value)}>
            {Object.entries(GOALS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ borderColor: 'var(--fuel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span className="live-dot" />
          <h2 style={{ marginBottom: 0 }}>{isRealStats ? 'Your live targets' : 'Live preview — fill in your stats above'}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 14 }}>
          <span className="odometer" style={{ fontSize: 34, color: 'var(--fuel)' }}>{liveTargets.calories}</span>
          <span className="odometer-unit">kcal / day{isRealStats ? '' : ' (example)'}</span>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <span className="mono small">BMR <strong style={{ color: 'var(--text)' }}>{liveTargets.bmr}</strong></span>
          <span className="mono small" style={{ color: 'var(--protein)' }}>P {liveTargets.protein}g</span>
          <span className="mono small" style={{ color: 'var(--carb)' }}>C {liveTargets.carbs}g</span>
          <span className="mono small" style={{ color: 'var(--fat)' }}>F {liveTargets.fat}g</span>
        </div>
        <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
          {isRealStats
            ? 'This updates instantly as you change anything above. Confirm below to lock it in.'
            : "Showing an example based on placeholder stats — enter your weight, height, and age above to personalize it."}
        </p>
      </div>

      <div className="card">
        <h2>Timed goal (optional)</h2>
        {!isRealStats && (
          <p className="muted small" style={{ marginBottom: 0 }}>Fill in your stats above first — the goal calculator needs your weight and BMR.</p>
        )}
        {isRealStats && !goalPlanResult && (
          <GoalPlanner
            weightLbs={Number(weightLbs)}
            weightKg={lbsToKg(Number(weightLbs))}
            bmr={liveTargets.bmr}
            tdee={liveTargets.tdee}
            onStart={setGoalPlanResult}
            onSkip={() => {}}
          />
        )}
        {isRealStats && goalPlanResult && (
          <div>
            <p className="small" style={{ marginBottom: 10 }}>
              <strong>{goalPlanResult.goalPlanCore.type === 'lose' ? 'Lose' : 'Gain'} {goalPlanResult.goalPlanCore.targetChangeLbs} lbs</strong> over {goalPlanResult.goalPlanCore.weeks} weeks —
              {' '}{goalPlanResult.preview.calories} kcal/day
            </p>
            <button className="secondary" onClick={() => setGoalPlanResult(null)}>Remove this goal</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Foods you like</h2>
        <p className="muted small" style={{ marginTop: -6, marginBottom: 12 }}>Tap to like (green). Tap again to remove.</p>
        <div className="tag-grid" style={{ marginBottom: 16 }}>
          {ALL_TAGS.map(tag => (
            <div
              key={tag}
              className={`tag-chip ${likedTags.includes(tag) ? 'like' : ''}`}
              onClick={() => toggleTag(tag, likedTags, setLikedTags, dislikedTags, setDislikedTags)}
            >
              {tag}
            </div>
          ))}
        </div>
        <h2>Foods to avoid</h2>
        <p className="muted small" style={{ marginTop: -6, marginBottom: 12 }}>Tap to exclude from your meal plan (red).</p>
        <div className="tag-grid">
          {ALL_TAGS.map(tag => (
            <div
              key={tag}
              className={`tag-chip ${dislikedTags.includes(tag) ? 'dislike' : ''}`}
              onClick={() => toggleTag(tag, dislikedTags, setDislikedTags, likedTags, setLikedTags)}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>

      <button className="primary" disabled={!canSubmit} onClick={handleSubmit} style={{ opacity: canSubmit ? 1 : 0.5 }}>
        {canSubmit
          ? `Lock in ${goalPlanResult ? goalPlanResult.preview.calories : liveTargets.calories} kcal/day & start planning`
          : 'Fill in your stats to continue'}
      </button>
    </div>
  )
}
