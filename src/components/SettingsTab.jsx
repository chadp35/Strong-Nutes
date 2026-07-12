import React, { useEffect, useState } from 'react'
import { GOALS, ACTIVITY_MULTIPLIERS, EATING_STYLES, kgToLbs } from '../lib/calculations.js'
import { exportAllDataJSON } from '../lib/exportData.js'
import { listCoaches } from '../lib/coaching.js'
import { ALLERGEN_OPTIONS, DIETARY_FRAMEWORK_OPTIONS } from '../data/allergens.js'
import GoalPlanner from './GoalPlanner.jsx'

const LEFTOVER_LABELS = {
  love: 'Happy eating the same meal 3-4 days in a row',
  twoDay: 'Fine for 2 days, then wants variety',
  hate: 'Prefers fresh-cooked meals over leftovers',
}
const COMPLEXITY_LABELS = {
  minimalist: 'Minimalist — under 20 min, few ingredients',
  moderate: 'Moderate — 30-45 min is fine',
  enthusiast: 'Culinary enthusiast — enjoys cooking',
}
const CONVENIENCE_LABELS = {
  yes: 'Wants convenience items and time-savers',
  balanced: 'Balance of fresh and convenience',
  scratch: 'Prefers cooking from raw, whole ingredients',
}
const LUNCH_TEMP_LABELS = {
  hot: 'Prefers a hot, cooked lunch',
  cold: 'Prefers cold, quick lunch options',
  either: 'No strong preference',
}

export default function SettingsTab({
  profile, userEmail, onEdit, onReset, onSignOut,
  onStartGoalPlan, onStopGoalPlan, fullState,
  onSelectCoach, onUpdateSafetyProfile,
  customRecipes, onDeleteRecipe,
}) {
  const weightLbs = kgToLbs(profile.weightKg)
  const [coaches, setCoaches] = useState([])
  const [editingSafety, setEditingSafety] = useState(false)
  const [draftAllergies, setDraftAllergies] = useState(profile.allergies || [])
  const [draftDiet, setDraftDiet] = useState(profile.dietaryFramework || 'none')

  useEffect(() => {
    listCoaches().then(setCoaches)
  }, [])

  const selectedCoach = coaches.find(c => c.user_id === profile.coachId)

  function toggleAllergy(key) {
    setDraftAllergies(a => (a.includes(key) ? a.filter(x => x !== key) : [...a, key]))
  }

  function saveSafety() {
    onUpdateSafetyProfile({ allergies: draftAllergies, dietaryFramework: draftDiet })
    setEditingSafety(false)
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Settings</h1>

      <div className="card">
        <h2>Account</h2>
        <p className="small" style={{ marginBottom: 0 }}>Signed in as <span className="mono">{userEmail}</span></p>
      </div>

      <div className="card" style={{ borderColor: profile.allergies?.length ? 'var(--danger)' : undefined }}>
        <h2>Allergies &amp; dietary framework</h2>
        {!editingSafety && (
          <>
            <p className="small" style={{ marginBottom: 4 }}>
              Allergies: {profile.allergies?.length ? profile.allergies.map(k => ALLERGEN_OPTIONS.find(a => a.key === k)?.label).join(', ') : 'None set'}
            </p>
            <p className="small" style={{ marginBottom: 10 }}>
              Framework: {DIETARY_FRAMEWORK_OPTIONS.find(d => d.key === (profile.dietaryFramework || 'none'))?.label}
            </p>
            <button className="secondary" onClick={() => { setDraftAllergies(profile.allergies || []); setDraftDiet(profile.dietaryFramework || 'none'); setEditingSafety(true) }}>
              Edit
            </button>
          </>
        )}
        {editingSafety && (
          <>
            <label style={{ marginBottom: 8 }}>Allergies (excluded everywhere the app suggests food)</label>
            <div className="tag-grid" style={{ marginBottom: 14 }}>
              {ALLERGEN_OPTIONS.map(a => (
                <div key={a.key} className={`tag-chip ${draftAllergies.includes(a.key) ? 'dislike' : ''}`} onClick={() => toggleAllergy(a.key)}>
                  {a.label}
                </div>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label>Dietary framework</label>
              <select value={draftDiet} onChange={e => setDraftDiet(e.target.value)}>
                {DIETARY_FRAMEWORK_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            <p className="muted small" style={{ marginBottom: 12 }}>
              This is keyword-based filtering, not certified compliance — halal/kosher especially aren't verified for certification or processing, just the most obvious exclusions (pork, non-fish seafood for kosher). Always check labels for anything that truly matters.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="primary" onClick={saveSafety}>Save</button>
              <button className="secondary" onClick={() => setEditingSafety(false)}>Cancel</button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Your profile</h2>
        <p className="small" style={{ marginBottom: 4 }}>Weight: <span className="mono">{Math.round(weightLbs)} lbs</span></p>
        <p className="small" style={{ marginBottom: 4 }}>Age: <span className="mono">{profile.age}</span></p>
        <p className="small" style={{ marginBottom: 4 }}>Activity: {ACTIVITY_MULTIPLIERS[profile.activityKey].label}</p>
        <p className="small" style={{ marginBottom: 4 }}>Goal: {GOALS[profile.goalKey].label}</p>
        <p className="small" style={{ marginBottom: 0 }}>Eating style: {EATING_STYLES[profile.eatingStyle || 'balanced']?.label}</p>
      </div>

      <div className="card">
        <h2>Daily targets</h2>
        <p className="small">BMR: <span className="mono">{profile.targets.bmr} kcal</span></p>
        <p className="small">Maintenance (TDEE): <span className="mono">{profile.targets.tdee} kcal</span></p>
        <p className="small">Target intake: <span className="mono">{profile.targets.calories} kcal</span></p>
        <p className="small" style={{ marginBottom: 0 }}>
          P{profile.targets.protein}g · C{profile.targets.carbs}g · F{profile.targets.fat}g
        </p>
      </div>

      <div className="card">
        <h2>Timed goal</h2>
        <GoalPlanner
          weightLbs={weightLbs}
          weightKg={profile.weightKg}
          bmr={profile.targets.bmr}
          tdee={profile.targets.tdee}
          activePlan={profile.goalPlan}
          onStart={onStartGoalPlan}
          onStop={onStopGoalPlan}
        />
      </div>

      <div className="card">
        <h2>Coach</h2>
        {coaches.length === 0 && (
          <p className="muted small" style={{ marginBottom: 0 }}>No coaches are set up yet.</p>
        )}
        {coaches.length > 0 && (
          <>
            <div className="field" style={{ marginBottom: selectedCoach ? 10 : 0 }}>
              <label>Choose a coach (optional)</label>
              <select value={profile.coachId || ''} onChange={e => onSelectCoach(e.target.value || null)}>
                <option value="">No coach</option>
                {coaches.map(c => (
                  <option key={c.user_id} value={c.user_id}>{c.display_name}</option>
                ))}
              </select>
            </div>
            {selectedCoach && (
              <p className="muted small" style={{ marginBottom: 0 }}>
                {selectedCoach.display_name} can see your check-ins and daily logging, and can leave comments or reactions on your progress.
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Food preferences</h2>
        <p className="small">Liked: {profile.likedTags?.length ? profile.likedTags.join(', ') : '—'}</p>
        <p className="small" style={{ marginBottom: 4 }}>Avoided: {profile.dislikedTags?.length ? profile.dislikedTags.join(', ') : '—'}</p>
        {profile.dislikedIngredients?.length > 0 && (
          <p className="small" style={{ marginBottom: 0 }}>Specific dislikes: {profile.dislikedIngredients.join(', ')}</p>
        )}
      </div>

      {(profile.leftoverTolerance || profile.cookingComplexity || profile.convenienceLevel || profile.lunchTemperature) && (
        <div className="card">
          <h2>Kitchen &amp; lifestyle</h2>
          {profile.leftoverTolerance && <p className="small">Leftovers: {LEFTOVER_LABELS[profile.leftoverTolerance]}</p>}
          {profile.cookingComplexity && <p className="small">Cooking style: {COMPLEXITY_LABELS[profile.cookingComplexity]}</p>}
          {profile.convenienceLevel && <p className="small">Convenience items: {CONVENIENCE_LABELS[profile.convenienceLevel]}</p>}
          {profile.lunchTemperature && <p className="small" style={{ marginBottom: 0 }}>Lunch preference: {LUNCH_TEMP_LABELS[profile.lunchTemperature]}</p>}
        </div>
      )}

      {(profile.beverageNotes || profile.nonNegotiable) && (
        <div className="card">
          <h2>Beverages &amp; non-negotiable</h2>
          {profile.beverageNotes && <p className="small" style={{ marginBottom: profile.nonNegotiable ? 8 : 0 }}>{profile.beverageNotes}</p>}
          {profile.nonNegotiable && (
            <p className="small" style={{ marginBottom: 0 }}><strong>Non-negotiable:</strong> {profile.nonNegotiable}</p>
          )}
        </div>
      )}

      {customRecipes?.length > 0 && (
        <div className="card">
          <h2>My recipes</h2>
          {customRecipes.map(r => (
            <div className="log-entry" key={r.id}>
              <div>
                <div className="meal-name">{r.name}</div>
                <div className="meal-macros">{r.calories} kcal · {r.type}</div>
              </div>
              <button className="remove-btn" onClick={() => onDeleteRecipe(r.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Export your data</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Body composition history has its own CSV export on the Progress tab. This exports everything — profile, logs, plans, pantry, recipes, and body comp — as one JSON file.
        </p>
        <button className="secondary" style={{ width: '100%' }} onClick={() => exportAllDataJSON(fullState)}>
          Export all data (JSON)
        </button>
      </div>

      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onEdit}>Redo full setup</button>
      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onSignOut}>Sign out</button>
      <button className="secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={onReset}>Reset all data</button>
    </div>
  )
}
