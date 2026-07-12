function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function toCSV(rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map(c => escape(c.label)).join(',')
  const lines = rows.map(row => columns.map(c => escape(row[c.key])).join(','))
  return [header, ...lines].join('\n')
}

// Body composition history as CSV — the main ask, for analysis in a
// spreadsheet or elsewhere outside the app.
export function exportBodyMetricsCSV(bodyMetrics) {
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'weightLbs', label: 'Weight (lbs)' },
    { key: 'waist', label: 'Waist (in)' },
    { key: 'quads', label: 'Quads (in)' },
    { key: 'calves', label: 'Calves (in)' },
    { key: 'bust', label: 'Bust (in)' },
    { key: 'hips', label: 'Hips (in)' },
    { key: 'notes', label: 'Notes' },
  ]
  const sorted = [...bodyMetrics].sort((a, b) => a.date.localeCompare(b.date))
  const csv = toCSV(sorted, columns)
  triggerDownload(`strong-nutes-body-composition-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv')
}

// Full data dump as JSON — everything the app has stored for this account,
// for backup or deeper analysis elsewhere.
export function exportAllDataJSON(state) {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    log: state.log,
    plan: state.plan,
    pantry: state.pantry,
    customFoods: state.customFoods,
    bodyMetrics: state.bodyMetrics,
    water: state.water,
  }
  triggerDownload(
    `strong-nutes-full-export-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  )
}
