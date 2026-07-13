import React, { useEffect, useState } from 'react'
import { fetchAllFeedback, updateFeedbackStatus } from '../lib/feedback.js'

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved']
const TYPE_LABELS = { bug: '🐞 Bug', idea: '💡 Idea', other: '💬 Other' }

function formatDate(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Owner-only view (gated in App.jsx by matching the signed-in email) of
// everything beta testers have submitted via Settings > Feedback & bug
// reports. RLS on the feedback table enforces the same restriction
// server-side, so this gate is a UI convenience, not the actual security.
export default function AdminFeedbackTab() {
  const [reports, setReports] = useState(null)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    fetchAllFeedback().then(setReports)
  }, [])

  async function setStatus(id, status) {
    setReports(rs => rs.map(r => (r.id === id ? { ...r, status } : r)))
    await updateFeedbackStatus(id, status)
  }

  if (reports === null) {
    return <div className="app-shell" style={{ paddingTop: 20 }}><p className="muted">Loading feedback…</p></div>
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter)
  const openCount = reports.filter(r => r.status === 'open').length

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Feedback &amp; bug reports</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        {reports.length} total · {openCount} open
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['open', 'in_progress', 'resolved', 'all'].map(f => (
          <button
            key={f}
            className="secondary"
            style={{
              flex: 1, fontSize: 12, fontWeight: 700,
              background: filter === f ? 'var(--fuel)' : 'var(--surface-2)',
              color: filter === f ? 'var(--on-fuel)' : 'var(--text)',
            }}
            onClick={() => setFilter(f)}
          >
            {f === 'in_progress' ? 'In progress' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <h3>Nothing here</h3>
          <p className="small">No {filter === 'all' ? '' : filter} reports.</p>
        </div>
      )}

      {filtered.map(r => (
        <div className="card" key={r.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span className="mono small">{TYPE_LABELS[r.type] || r.type}</span>
            <span className="muted small">{formatDate(r.created_at)}</span>
          </div>
          <p className="small" style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{r.message}</p>
          <p className="muted small" style={{ marginBottom: 10 }}>{r.user_email || 'Unknown user'}</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUS_OPTIONS.map(s => (
              <button
                key={s}
                className="secondary"
                style={{
                  flex: 1, fontSize: 11, padding: '6px 4px',
                  background: r.status === s ? 'var(--fuel)' : 'var(--surface-2)',
                  color: r.status === s ? 'var(--on-fuel)' : 'var(--text)',
                }}
                onClick={() => setStatus(r.id, s)}
              >
                {s === 'in_progress' ? 'In progress' : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
