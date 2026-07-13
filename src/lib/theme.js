// Theme is a device/browser display preference, not synced app data — it
// lives in localStorage (like a system setting) rather than in the synced
// state blob, so it doesn't fight with cross-device sync and applies
// instantly on load before any network round-trip.

const STORAGE_KEY = 'strong-nutes-theme'
export const THEMES = [
  { key: 'dark', label: 'Dark (red & charcoal)' },
  { key: 'light', label: 'Light' },
]

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* private browsing / storage disabled — theme just won't persist */
  }
  applyTheme(theme)
}
