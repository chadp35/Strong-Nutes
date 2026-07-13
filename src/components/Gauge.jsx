import React from 'react'

export default function Gauge({ label, value, target, unit = 'g', color }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  const over = value > target
  return (
    <div className="gauge">
      <div className="gauge-head">
        <span className="gauge-label">{label}</span>
        <span className="gauge-value mono" style={over ? { color: 'var(--danger)' } : undefined}>
          {Math.round(value)} / {Math.round(target)}{unit}{over ? ' · over' : ''}
        </span>
      </div>
      <div className="gauge-track">
        <div
          className="gauge-fill"
          style={{ width: `${pct}%`, background: over ? 'var(--danger)' : color }}
        />
      </div>
    </div>
  )
}
