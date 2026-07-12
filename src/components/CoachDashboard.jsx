import React, { useEffect, useState } from 'react'
import { fetchMyClients, fetchComments, fetchReactions, postComment, toggleReaction } from '../lib/coaching.js'

function last7Dates() {
  const dates = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export default function CoachDashboard({ myUserId }) {
  const [clients, setClients] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [threads, setThreads] = useState({})
  const [messageDrafts, setMessageDrafts] = useState({})

  useEffect(() => {
    fetchMyClients(myUserId).then(setClients)
  }, [myUserId])

  async function openClient(clientId) {
    if (expandedId === clientId) {
      setExpandedId(null)
      return
    }
    setExpandedId(clientId)
    if (!threads[clientId]) {
      const [comments, reactions] = await Promise.all([fetchComments(clientId), fetchReactions(clientId)])
      setThreads(t => ({ ...t, [clientId]: { comments, reactions } }))
    }
  }

  async function sendComment(clientId) {
    const message = (messageDrafts[clientId] || '').trim()
    if (!message) return
    await postComment({ clientId, authorId: myUserId, message })
    const comments = await fetchComments(clientId)
    setThreads(t => ({ ...t, [clientId]: { ...t[clientId], comments } }))
    setMessageDrafts(d => ({ ...d, [clientId]: '' }))
  }

  async function react(clientId, targetType, targetId) {
    await toggleReaction({ clientId, authorId: myUserId, targetType, targetId })
    const reactions = await fetchReactions(clientId)
    setThreads(t => ({ ...t, [clientId]: { ...t[clientId], reactions } }))
  }

  if (clients === null) {
    return <div className="app-shell" style={{ paddingTop: 20 }}><p className="muted">Loading clients…</p></div>
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Your clients</h1>
      <p className="muted small" style={{ marginBottom: 16 }}>
        {clients.length} client{clients.length === 1 ? '' : 's'} {clients.length === 1 ? 'has' : 'have'} you as their coach.
      </p>

      {clients.length === 0 && (
        <div className="empty-state">
          <h3>No clients yet</h3>
          <p className="small">Once someone selects you as their coach in Settings, they'll show up here.</p>
        </div>
      )}

      {clients.map(client => {
        const profile = client.profile || {}
        const targets = profile.targets || {}
        const bodyMetrics = client.body_metrics || []
        const sortedMetrics = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date))
        const latest = sortedMetrics[sortedMetrics.length - 1]
        const previous = sortedMetrics[sortedMetrics.length - 2]
        const weightDelta =
          latest && previous && latest.weightLbs != null && previous.weightLbs != null
            ? Math.round((latest.weightLbs - previous.weightLbs) * 10) / 10
            : null

        const log = client.log || {}
        const days = last7Dates()
        const isOpen = expandedId === client.user_id
        const thread = threads[client.user_id]

        return (
          <div className="card" key={client.user_id}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', cursor: 'pointer' }}
              onClick={() => openClient(client.user_id)}
            >
              <div>
                <div className="meal-name">{client.contact_email || 'Client'}</div>
                {profile.goalPlan && (
                  <div className="meal-type">
                    {profile.goalPlan.type === 'lose' ? 'Losing' : 'Gaining'} {profile.goalPlan.targetChangeLbs} lbs · {profile.goalPlan.weeks} wk plan
                  </div>
                )}
              </div>
              <span className="mono small muted">{targets.calories || '—'} kcal/day</span>
            </div>

            {latest && (
              <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
                Latest weight: <strong>{latest.weightLbs ?? '—'} lbs</strong> ({latest.date})
                {weightDelta != null && (
                  <span className="muted"> · {weightDelta > 0 ? '+' : ''}{weightDelta} lbs vs previous check-in</span>
                )}
              </p>
            )}

            <p className="muted small" style={{ marginTop: 10, marginBottom: 4 }}>Last 7 days logged</p>
            <div style={{ display: 'flex', gap: 4, marginBottom: isOpen ? 12 : 0 }}>
              {days.map(d => {
                const entries = log[d] || []
                const cals = entries.reduce((sum, e) => sum + (e.calories || 0), 0)
                return (
                  <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                    <div className="gauge-track" style={{ height: 32, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: '100%',
                          height: `${targets.calories ? Math.min((cals / targets.calories) * 100, 100) : 0}%`,
                          background: entries.length ? 'var(--fuel)' : 'transparent',
                        }}
                      />
                    </div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{d.slice(5)}</div>
                  </div>
                )
              })}
            </div>

            {isOpen && (
              <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <h2 style={{ fontSize: 13 }}>Check-in history</h2>
                {sortedMetrics.length === 0 && <p className="muted small">No check-ins logged yet.</p>}
                {[...sortedMetrics].reverse().slice(0, 8).map(m => {
                  const reactionCount = thread?.reactions?.filter(r => r.target_type === 'body_metric' && r.target_id === m.id).length || 0
                  return (
                    <div className="log-entry" key={m.id}>
                      <div>
                        <div className="meal-name">{m.date}</div>
                        <div className="meal-macros">{m.weightLbs != null ? `${m.weightLbs} lbs` : ''}{m.notes ? ` · ${m.notes}` : ''}</div>
                      </div>
                      <button className="secondary" onClick={() => react(client.user_id, 'body_metric', m.id)}>
                        💪 {reactionCount > 0 ? reactionCount : ''}
                      </button>
                    </div>
                  )
                })}

                <h2 style={{ fontSize: 13, marginTop: 14 }}>Comments</h2>
                {thread?.comments?.length ? (
                  thread.comments.map(c => (
                    <p className="small" key={c.id} style={{ marginBottom: 6 }}>
                      <strong>{c.author_id === myUserId ? 'You' : 'Client'}:</strong> {c.message}
                    </p>
                  ))
                ) : (
                  <p className="muted small">No comments yet.</p>
                )}

                <div className="field" style={{ marginTop: 10 }}>
                  <input
                    value={messageDrafts[client.user_id] || ''}
                    onChange={e => setMessageDrafts(d => ({ ...d, [client.user_id]: e.target.value }))}
                    placeholder="Leave encouragement or feedback…"
                  />
                </div>
                <button className="primary" onClick={() => sendComment(client.user_id)}>Send</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
