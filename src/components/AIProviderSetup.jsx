import React, { useState } from 'react'
import { AI_PROVIDERS } from '../lib/aiConfig.js'

// Shared "pick a provider, get a key, paste it in" card — used both the
// first time someone opens the AI scanner (inline, mid-task) and from
// Settings when they want to view/change/remove it later. Never sends the
// key anywhere itself; that's entirely up to the caller's onSave.
export default function AIProviderSetup({ onSave, onCancel, saveLabel = 'Save & continue' }) {
  const providerKeys = Object.keys(AI_PROVIDERS)
  const [provider, setProvider] = useState(providerKeys[0])
  const [apiKey, setApiKey] = useState('')
  const [sync, setSync] = useState(false)
  const info = AI_PROVIDERS[provider]

  function submit() {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    onSave({ provider, apiKey: trimmed, sync })
  }

  return (
    <div>
      <p className="small" style={{ marginBottom: 12 }}>
        The food scanner uses AI to identify meals from a photo or description, so it needs your own API key from one of these providers. Your key goes straight from your device to theirs for each scan — we only store it if you turn on syncing below.
      </p>
      <div className="field">
        <label>AI provider</label>
        <select value={provider} onChange={e => { setProvider(e.target.value); setApiKey('') }}>
          {providerKeys.map(k => <option key={k} value={k}>{AI_PROVIDERS[k].label}</option>)}
        </select>
      </div>
      <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
        <p className="small" style={{ marginBottom: 8, fontWeight: 700 }}>How to get a key</p>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {info.steps.map((s, i) => (
            <li key={i} className="small" style={{ marginBottom: i < info.steps.length - 1 ? 6 : 0 }}>{s}</li>
          ))}
        </ol>
        <a href={info.getKeyUrl} target="_blank" rel="noreferrer" className="small" style={{ display: 'inline-block', marginTop: 10 }}>
          Open {info.label.split(' (')[0]}'s key page &rarr;
        </a>
      </div>
      <div className="field">
        <label>Your {info.label} API key</label>
        <input
          type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
          placeholder={info.keyPlaceholder} autoComplete="off" spellCheck="false"
        />
      </div>
      <div
        className="field"
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => setSync(s => !s)}
      >
        <div className={`checkbox ${sync ? 'on' : ''}`}>{sync ? '✓' : ''}</div>
        <label style={{ marginBottom: 0, cursor: 'pointer' }}>Sync this key to my account so it's there on my other devices too</label>
      </div>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Off by default — the key just stays on this device. Turning this on stores it with the rest of your account data, protected the same way (only you can read it).
      </p>
      <button className="primary" style={{ width: '100%', opacity: apiKey.trim() ? 1 : 0.5 }} disabled={!apiKey.trim()} onClick={submit}>
        {saveLabel}
      </button>
      {onCancel && (
        <button className="secondary" style={{ width: '100%', marginTop: 8 }} onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}
