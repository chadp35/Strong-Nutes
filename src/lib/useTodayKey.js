import { useEffect, useState } from 'react'
import { todayKey } from './storage.js'

// Keeps "today" reactive across midnight without requiring a page reload.
// A plain `todayKey()` call only evaluates once per render, so a tab left
// open overnight (or a phone that was asleep/backgrounded) would keep
// showing yesterday's log/plan day until something else happened to trigger
// a re-render. This polls every 30s (cheap, and catches the rollover within
// half a minute of midnight) and also re-checks immediately whenever the tab
// regains focus or visibility — the common case of someone opening the app
// the next morning after it sat backgrounded overnight.
export function useTodayKey() {
  const [key, setKey] = useState(todayKey())

  useEffect(() => {
    function check() {
      const next = todayKey()
      setKey(prev => (prev === next ? prev : next))
    }

    const interval = setInterval(check, 30000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return key
}
