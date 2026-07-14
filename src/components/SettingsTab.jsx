import React, { useEffect, useState } from 'react'
import { GOALS, ACTIVITY_MULTIPLIERS, EATING_STYLES, BODY_FAT_BANDS, DIETING_CONFIDENCE, kgToLbs } from '../lib/calculations.js'
import { exportAllDataJSON } from '../lib/exportData.js'
import { listCoaches } from '../lib/coaching.js'
import { submitFeedback } from '../lib/feedback.js'
import { ALLERGEN_OPTIONS, DIETARY_FRAMEWORK_OPTIONS } from '../data/allergens.js'
import { THEMES, getStoredTheme, setStoredTheme } from '../lib/theme.js'
import { AI_PROVIDERS } from '../lib/aiConfig.js'
import GoalPlanner from './GoalPlanner.jsx'
import AIProviderSetup from './AIProviderSetup.jsx'

const FEEDBACK_TYPES = [
  { key: 'bug', label: '🐞 Bug' },
  { key: 'idea', label: '💡 Idea' },
  { key: 'other', label: '💬 Other' },
]

function FeedbackForm({ userId, userEmail }) {
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    const ok = await submitFeedback({ userId, userEmail, type, message: message.trim(), page: 'settings' })
    setSending(false)
    if (ok) {
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 4000)
    }
  }

  return (
    <div className="card">
      <h2>Feedback &amp; bug reports</h2>
      <p className="muted small" style={{ marginBottom: 12 }}>
        Beta testing — found something broken, or have an idea? This goes straight to me.
      </p>
      <div className="field">
        <div style={{ display: 'flex', gap: 6 }}>
          {FEEDBACK_TYPES.map(t => (
            <button
              key={t.key}
              className="secondary"
              style={{
                flex: 1, fontWeight: 700,
                background: type === t.key ? 'var(--fuel)' : 'var(--surface-2)',
                color: type === t.key ? 'var(--on-fuel)' : 'var(--text)',
                borderColor: type === t.key ? 'var(--fuel)' : 'var(--border)',
              }}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          placeholder={type === 'bug' ? "What happened, and what did you expect instead?" : "What's on your mind?"}
          style={{
            width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '11px 12px', borderRadius: 10, fontSize: 15,
            fontFamily: 'Inter', resize: 'vertical',
          }}
        />
      </div>
      <button className="primary" style={{ width: '100%', opacity: message.trim() ? 1 : 0.5 }} disabled={!message.trim() || sending} onClick={send}>
        {sending ? 'Sending…' : sent ? 'Sent — thank you!' : 'Send feedback'}
      </button>
    </div>
  )
}

function ThemePicker() {
  const [theme, setTheme] = useState(getStoredTheme())

  function choose(key) {
    setTheme(key)
    setStoredTheme(key)
  }

  return (
    <div className="theme-picker">
      {THEMES.map(t => (
        <div key={t.key} className={`theme-option ${theme === t.key ? 'active' : ''}`} onClick={() => choose(t.key)}>
          <div
            className="theme-swatch"
            style={{
              background: t.key === 'dark'
                ? 'linear-gradient(135deg, #1a1717 55%, #ff3b30 55%)'
                : 'linear-gradient(135deg, #ffffff 55%, #e0342a 55%)',
            }}
          />
          {t.label}
        </div>
      ))}
    </div>
  )
}

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

// Shows the current AI-scanner provider/key (masked) with Change/Remove, or
// the setup form itself if nothing's configured yet or "Change" was tapped.
function AIScannerCard({ aiConfig, onSetAIConfig, onClearAIConfig }) {
  const [editing, setEditing] = useState(false)
  const configured = aiConfig?.provider && aiConfig?.apiKey

  if (!configured || editing) {
    return (
      <div className="card">
        <h2>AI food scanner</h2>
        <AIProviderSetup
          onSave={cfg => { onSetAIConfig(cfg); setEditing(false) }}
          onCancel={configured ? () => setEditing(false) : undefined}
          saveLabel={configured ? 'Save' : 'Save & enable scanner'}
        />
      </div>
    )
  }

  const key = aiConfig.apiKey
  const masked = key.length > 8 ? `${key.slice(0, 4)}••••${key.slice(-4)}` : '••••'

  return (
    <div className="card">
      <h2>AI food scanner</h2>
      <p className="small" style={{ marginBottom: 4 }}>Provider: {AI_PROVIDERS[aiConfig.provider]?.label || aiConfig.provider}</p>
      <p className="small mono" style={{ marginBottom: 4 }}>Key: {masked}</p>
      <p className="small" style={{ marginBottom: 12 }}>
        {aiConfig.synced ? 'Synced across your devices.' : 'Stored on this device only.'}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="secondary" style={{ flex: 1 }} onClick={() => setEditing(true)}>Change</button>
        <button
          className="secondary" style={{ flex: 1, color: 'var(--danger)' }}
          onClick={() => { if (confirm('Remove your saved AI key? You can add it again anytime from here.')) onClearAIConfig() }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export default function SettingsTab({
  profile, userEmail, userId, onEdit, onReset, onSignOut,
  onStartGoalPlan, onStopGoalPlan, fullState,
  onSelectCoach, onUpdateSafetyProfile,
  customRecipes, onDeleteRecipe, onEditRecipe,
  aiConfig, onSetAIConfig, onClearAIConfig,
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

      <div className="card">
        <h2>Appearance</h2>
        <ThemePicker />
      </div>

      <FeedbackForm userId={userId} userEmail={userEmail} />

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
        <p className="small" style={{ marginBottom: profile.bodyFatBand || profile.dietingConfidence || profile.weightLossDrugUse === 'yes' ? 4 : 0 }}>
          Eating style: {EATING_STYLES[profile.eatingStyle || 'balanced']?.label}
        </p>
        {profile.bodyFatBand && profile.bodyFatBand !== 'notSure' && (
          <p className="small" style={{ marginBottom: 4 }}>Body fat: {BODY_FAT_BANDS[profile.bodyFatBand]?.label}</p>
        )}
        {profile.dietingConfidence && (
          <p className="small" style={{ marginBottom: profile.weightLossDrugUse === 'yes' ? 4 : 0 }}>
            Past-diet confidence: {DIETING_CONFIDENCE[profile.dietingConfidence]?.label}
          </p>
        )}
        {profile.weightLossDrugUse === 'yes' && (
          <p className="small" style={{ marginBottom: 0 }}>Using a weight-loss medication</p>
        )}
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

      <AIScannerCard aiConfig={aiConfig} onSetAIConfig={onSetAIConfig} onClearAIConfig={onClearAIConfig} />

      <div className="card">
        <h2>Timed goal</h2>
        <GoalPlanner
          weightLbs={weightLbs}
          weightKg={profile.weightKg}
          bmr={profile.targets.bmr}
          tdee={profile.targets.tdee}
          activePlan={profile.goalPlan}
          confidenceKey={profile.dietingConfidence}
          weightLossDrugUse={profile.weightLossDrugUse}
          bodyFatBand={profile.bodyFatBand}
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
              <button className="secondary" style={{ marginRight: 8 }} onClick={() => onEditRecipe(r)}>Edit</button>
              <button className="remove-btn" onClick={() => { if (confirm(`Delete "${r.name}"? This can't be undone.`)) onDeleteRecipe(r.id) }}>×</button>
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

      <button
        className="secondary"
        style={{ width: '100%', marginBottom: 10 }}
        onClick={() => {
          if (confirm("This clears your profile answers and sends you back through setup from scratch — your log, plan, pantry, recipes, and progress history are kept. Continue?")) onEdit()
        }}
      >
        Redo full setup
      </button>
      <button className="secondary" style={{ width: '100%', marginBottom: 10 }} onClick={onSignOut}>Sign out</button>
      <button className="secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={onReset}>Reset all data</button>
    </div>
  )
}
