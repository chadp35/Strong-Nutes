import React from 'react'
import { GOALS, ACTIVITY_MULTIPLIERS, kgToLbs } from '../lib/calculations.js'

export default function SettingsTab({ profile, userEmail, onEdit, onReset, onSignOut }) {
  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Settings</h1>

      <div className="card">
        <h2>Account</h2>
        <p className="small" style={{ marginBottom: 0 }}>Signed in as <span className="mono">{userEmail}</span></p>
      </div>

      <div className="card">
        <h2>Your profile</h2>
        <p className="small" style={{ marginBottom: 4 }}>Weight: <span className="mono">{Math.round(kgToLbs(profile.weightKg))} lbs</span></p>
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
        <h2>Preferences</h2>
        <p className="small">Liked: {profile.likedTags.length ? profile.likedTags.join(', ') : '—'}</p>
        <p className="small" style={{ marginBottom: 0 }}>Avoided: {profile.dislikedTags.length ? profile.dislikedTags.join(', ') : '—'}</p>
      </div>

      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onEdit}>Redo setup</button>
      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onSignOut}>Sign out</button>
      <button className="secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={onReset}>Reset all data</button>
    </div>
  )
}
