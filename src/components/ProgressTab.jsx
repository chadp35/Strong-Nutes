import React, { useEffect, useMemo, useState } from 'react'
import { exportBodyMetricsCSV } from '../lib/exportData.js'
import { fetchComments, fetchReactions, postComment } from '../lib/coaching.js'

const MEASUREMENT_FIELDS = [
  { key: 'waist', label: 'Waist (in)' },
  { key: 'quads', label: 'Quads (in)' },
  { key: 'calves', label: 'Calves (in)' },
  { key: 'bust', label: 'Bust (in)' },
  { key: 'hips', label: 'Hips (in)' },
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function ProgressTab({ bodyMetrics, onAddEntry, onDeleteEntry, myUserId, hasCoach }) {
  const [showForm, setShowForm] = useState(false)
  const [dismissedPrompt, setDismissedPrompt] = useState(false)
  const [form, setForm] = useState({ weightLbs: '', waist: '', quads: '', calves: '', bust: '', hips: '', notes: '' })
  const [comments, setComments] = useState([])
  const [reactions, setReactions] = useState([])
  const [replyDrafts, setReplyDrafts] = useState({})

  useEffect(() => {
    if (!myUserId || !hasCoach) return
    fetchComments(myUserId).then(setComments)
    fetchReactions(myUserId).then(setReactions)
  }, [myUserId, hasCoach])

  async function sendReply(entryId) {
    const message = (replyDrafts[entryId] || '').trim()
    if (!message || !myUserId) return
    await postComment({ clientId: myUserId, authorId: myUserId, message, targetType: 'body_metric', targetId: entryId })
    setComments(await fetchComments(myUserId))
    setReplyDrafts(d => ({ ...d, [entryId]: '' }))
  }

  const sorted = useMemo(
    () => [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date)),
    [bodyMetrics]
  )

  const lastEntry = sorted[sorted.length - 1]
  const needsCheckin = !dismissedPrompt && (!lastEntry || daysSince(lastEntry.date) >= 7)

  function submit() {
    if (!form.weightLbs && !form.waist && !form.quads && !form.calves && !form.bust && !form.hips) return
    const entry = {
      id: Date.now().toString(),
      date: todayKey(),
      weightLbs: form.weightLbs ? Number(form.weightLbs) : null,
      waist: form.waist ? Number(form.waist) : null,
      quads: form.quads ? Number(form.quads) : null,
      calves: form.calves ? Number(form.calves) : null,
      bust: form.bust ? Number(form.bust) : null,
      hips: form.hips ? Number(form.hips) : null,
      notes: form.notes || '',
    }
    onAddEntry(entry)
    setForm({ weightLbs: '', waist: '', quads: '', calves: '', bust: '', hips: '', notes: '' })
    setShowForm(false)
    setDismissedPrompt(true)
  }

  const weightPoints = sorted.filter(e => e.weightLbs != null)

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Progress</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Totally optional — track what's useful to you. Nothing here is required.
      </p>

      {needsCheckin && !showForm && (
        <div className="card" style={{ borderColor: 'var(--fuel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className="live-dot" />
            <h2 style={{ marginBottom: 0 }}>Weekly check-in</h2>
          </div>
          <p className="small" style={{ marginBottom: 12 }}>
            {lastEntry ? `It's been ${daysSince(lastEntry.date)} days since your last check-in.` : "You haven't logged a check-in yet."}
            {' '}Log whatever you'd like to track — even just weight is useful.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" onClick={() => setShowForm(true)}>Log check-in</button>
            <button className="secondary" onClick={() => setDismissedPrompt(true)}>Not now</button>
          </div>
        </div>
      )}

      {weightPoints.length >= 2 && <WeightChart points={weightPoints} />}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ marginBottom: 0 }}>Log a check-in</h2>
          <button className="secondary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New entry'}</button>
        </div>

        {showForm && (
          <div style={{ marginBottom: 16 }}>
            <div className="field">
              <label>Weight (lbs)</label>
              <input type="number" value={form.weightLbs} onChange={e => setForm({ ...form, weightLbs: e.target.value })} placeholder="185" />
            </div>
            <p className="muted small" style={{ marginBottom: 8 }}>Measurements — all optional</p>
            <div className="row field">
              {MEASUREMENT_FIELDS.slice(0, 2).map(f => (
                <div key={f.key}>
                  <label>{f.label}</label>
                  <input type="number" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="row field">
              {MEASUREMENT_FIELDS.slice(2, 4).map(f => (
                <div key={f.key}>
                  <label>{f.label}</label>
                  <input type="number" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="field">
              <label>{MEASUREMENT_FIELDS[4].label}</label>
              <input type="number" value={form.hips} onChange={e => setForm({ ...form, hips: e.target.value })} style={{ maxWidth: 160 }} />
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="How you're feeling, anything notable" />
            </div>
            <button className="primary" onClick={submit}>Save check-in</button>
          </div>
        )}

        {sorted.length === 0 && !showForm && (
          <p className="muted small">No check-ins logged yet.</p>
        )}
        {[...sorted].reverse().map(e => {
          const entryComments = comments.filter(c => c.target_type === 'body_metric' && c.target_id === e.id)
          const entryReactionCount = reactions.filter(r => r.target_type === 'body_metric' && r.target_id === e.id).length
          return (
            <div key={e.id} style={{ borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
              <div className="log-entry" style={{ border: 'none', padding: 0 }}>
                <div>
                  <div className="meal-name">{e.date}</div>
                  <div className="meal-macros">
                    {[
                      e.weightLbs != null ? `${e.weightLbs} lbs` : null,
                      e.waist != null ? `Waist ${e.waist}"` : null,
                      e.quads != null ? `Quads ${e.quads}"` : null,
                      e.calves != null ? `Calves ${e.calves}"` : null,
                      e.bust != null ? `Bust ${e.bust}"` : null,
                      e.hips != null ? `Hips ${e.hips}"` : null,
                    ].filter(Boolean).join(' · ')}
                    {entryReactionCount > 0 && <span> · 💪 {entryReactionCount}</span>}
                  </div>
                  {e.notes && <div className="muted small" style={{ marginTop: 2 }}>{e.notes}</div>}
                </div>
                <button className="remove-btn" onClick={() => onDeleteEntry(e.id)}>×</button>
              </div>

              {entryComments.length > 0 && (
                <div style={{ marginTop: 8, marginLeft: 4 }}>
                  {entryComments.map(c => (
                    <p className="small" key={c.id} style={{ marginBottom: 4 }}>
                      <strong>{c.author_id === myUserId ? 'You' : 'Coach'}:</strong> {c.message}
                    </p>
                  ))}
                </div>
              )}

              {hasCoach && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    value={replyDrafts[e.id] || ''}
                    onChange={ev => setReplyDrafts(d => ({ ...d, [e.id]: ev.target.value }))}
                    placeholder="Reply to your coach…"
                    style={{ flex: 1 }}
                  />
                  <button className="secondary" onClick={() => sendReply(e.id)}>Send</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {sorted.length > 0 && (
        <button className="secondary" style={{ width: '100%' }} onClick={() => exportBodyMetricsCSV(bodyMetrics)}>
          Export history (CSV)
        </button>
      )}
    </div>
  )
}

function WeightChart({ points }) {
  const width = 320
  const height = 120
  const padding = 12
  const weights = points.map(p => p.weightLbs)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const range = max - min || 1

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2)
    const y = height - padding - ((p.weightLbs - min) / range) * (height - padding * 2)
    return [x, y]
  })

  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <div className="card">
      <h2>Weight trend</h2>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <path d={path} fill="none" stroke="var(--fuel)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="var(--fuel)" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="mono small muted">{min} lbs</span>
        <span className="mono small muted">{max} lbs</span>
      </div>
    </div>
  )
}
