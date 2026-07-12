import React, { useEffect, useState } from 'react'
import { GOALS, ACTIVITY_MULTIPLIERS, kgToLbs } from '../lib/calculations.js'
import { exportAllDataJSON } from '../lib/exportData.js'
import { listCoaches } from '../lib/coaching.js'
import GoalPlanner from './GoalPlanner.jsx'

export default function SettingsTab({
  profile, userEmail, onEdit, onReset, onSignOut,
  onStartGoalPlan, onStopGoalPlan, fullState,
  onSelectCoach,
}) {
  const weightLbs = kgToLbs(profile.weightKg)
  const [coaches, setCoaches] = useState([])

  useEffect(() => {
    listCoaches().then(setCoaches)
  }, [])

  const selectedCoach = coaches.find(c => c.user_id === profile.coachId)

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Settings</h1>

      <div className="card">
        <h2>Account</h2>
        <p className="small" style={{ marginBottom: 0 }}>Signed in as <span className="mono">{userEmail}</span></p>
      </div>

      <div className="card">
        <h2>Your profile</h2>
        <p className="small" style={{ marginBottom: 4 }}>Weight: <span className="mono">{Math.round(weightLbs)} lbs</span></p>
        <p className="small" style={{ marginBottom: 4 }}>Age: <span className="mono">{profile.age}</span></p>
        <p className="small" style={{ marginBottom: 4 }}>Activity: {ACTIVITY_MULTIPLIERS[profile.activityKey].label}</p>
        <p className="small" style={{ marginBottom: 0 }}>Goal: {GOALS[profile.goalKey].label}</p>
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
        <h2>Preferences</h2>
        <p className="small">Liked: {profile.likedTags.length ? profile.likedTags.join(', ') : '—'}</p>
        <p className="small" style={{ marginBottom: 0 }}>Avoided: {profile.dislikedTags.length ? profile.dislikedTags.join(', ') : '—'}</p>
      </div>

      <div className="card">
        <h2>Export your data</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Body composition history has its own CSV export on the Progress tab. This exports everything — profile, logs, plans, pantry, and body comp — as one JSON file.
        </p>
        <button className="secondary" style={{ width: '100%' }} onClick={() => exportAllDataJSON(fullState)}>
          Export all data (JSON)
        </button>
      </div>

      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onEdit}>Redo setup</button>
      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onSignOut}>Sign out</button>
      <button className="secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={onReset}>Reset all data</button>
    </div>
  )
}
