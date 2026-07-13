import React from 'react'

export default function ShoppingListTab({ list, checked, onToggle, onClearChecks }) {
  if (!list || list.length === 0) {
    return (
      <div className="app-shell" style={{ paddingTop: 20 }}>
        <div className="empty-state">
          <h3>No shopping list yet</h3>
          <p className="small">Generate a meal plan first — your shopping list builds itself from it.</p>
        </div>
      </div>
    )
  }

  const checkedCount = list.filter(i => checked[i.key]).length

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h1 style={{ fontSize: 20 }}>Shopping list</h1>
        <span className="muted small mono">{checkedCount}/{list.length}</span>
      </div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        Aggregated from your meal plan and converted to real shopping quantities (weight or item counts, not recipe measurements). Works for Walmart, Kroger, or wherever you shop.
      </p>
      {checkedCount > 0 && (
        <button
          className="secondary"
          style={{ width: '100%', marginBottom: 14 }}
          onClick={() => { if (confirm('Uncheck everything? Handy for reusing this list on a new trip.')) onClearChecks() }}
        >
          Uncheck all ({checkedCount})
        </button>
      )}
      <div className="card">
        {list.map(({ key, label }) => (
          <div className={`shop-item ${checked[key] ? 'checked' : ''}`} key={key} onClick={() => onToggle(key)}>
            <div className={`checkbox ${checked[key] ? 'on' : ''}`}>{checked[key] ? '✓' : ''}</div>
            <div className="shop-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
