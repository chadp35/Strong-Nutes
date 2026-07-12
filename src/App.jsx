import React, { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient.js'
import AuthScreen from './components/AuthScreen.jsx'
import Onboarding from './components/Onboarding.jsx'
import Dashboard from './components/Dashboard.jsx'
import MealPlanTab from './components/MealPlanTab.jsx'
import PantryTab from './components/PantryTab.jsx'
import ShoppingListTab from './components/ShoppingListTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'
import { loadState, saveState, todayKey, defaultState } from './lib/storage.js'
import { generatePlan, generateShoppingList } from './lib/mealPlanner.js'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [state, setState] = useState(defaultState)
  const [stateLoading, setStateLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const saveTimer = useRef(null)

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Load this user's saved data whenever they sign in
  useEffect(() => {
    if (!session) {
      setState(defaultState)
      return
    }
    setStateLoading(true)
    loadState(session.user.id).then(s => {
      setState(s)
      setStateLoading(false)
    })
  }, [session?.user?.id])

  // Debounced save to Supabase on any state change (after initial load)
  useEffect(() => {
    if (!session || stateLoading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveState(session.user.id, state)
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [state, session?.user?.id, stateLoading])

  function handleOnboardingComplete(profile) {
    setState(s => ({ ...s, profile }))
  }

  function handleAddEntry(entry) {
    const key = todayKey()
    setState(s => ({ ...s, log: { ...s.log, [key]: [...(s.log[key] || []), entry] } }))
  }

  function handleRemoveEntry(id) {
    const key = todayKey()
    setState(s => ({ ...s, log: { ...s.log, [key]: (s.log[key] || []).filter(e => e.id !== id) } }))
  }

  function handleRegeneratePlan(days) {
    const plan = generatePlan({
      targets: state.profile.targets,
      likedTags: state.profile.likedTags,
      dislikedTags: state.profile.dislikedTags,
      days,
    })
    setState(s => ({ ...s, plan, shoppingChecked: {} }))
  }

  function handleToggleShopItem(key) {
    setState(s => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [key]: !s.shoppingChecked[key] } }))
  }

  function handleSavePantry(items) {
    setState(s => ({ ...s, pantry: items }))
  }

  function handleLogPantryMeal(meal) {
    handleAddEntry({
      id: Date.now().toString(),
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    })
  }

  function handleReset() {
    if (confirm('This clears your profile, log, and meal plan. Continue?')) {
      setState({ ...defaultState })
    }
  }

  function handleSignOut() {
    supabase.auth.signOut()
  }

  if (authLoading) {
    return <div className="app-shell" style={{ paddingTop: 40 }}><p className="muted">Loading…</p></div>
  }
  if (!session) {
    return <AuthScreen />
  }
  if (stateLoading) {
    return <div className="app-shell" style={{ paddingTop: 40 }}><p className="muted">Loading your data…</p></div>
  }
  if (!state.profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  const todaysEntries = state.log[todayKey()] || []
  const todaysPlanMeals = state.plan?.[0]?.meals || null
  const shoppingList = state.plan ? generateShoppingList(state.plan) : []

  const todaysTotals = todaysEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
    }),
    { calories: 0, protein: 0 }
  )
  const remainingTargets = {
    calories: state.profile.targets.calories - todaysTotals.calories,
    protein: state.profile.targets.protein - todaysTotals.protein,
  }

  return (
    <>
      <div className="app-shell">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">F</div>
            <h1>Fuel</h1>
          </div>
        </div>
      </div>

      {tab === 'dashboard' && (
        <Dashboard
          profile={state.profile}
          todaysEntries={todaysEntries}
          onAddEntry={handleAddEntry}
          onRemoveEntry={handleRemoveEntry}
          todaysPlanMeals={todaysPlanMeals}
        />
      )}
      {tab === 'plan' && (
        <MealPlanTab plan={state.plan} onRegenerate={handleRegeneratePlan} targets={state.profile.targets} />
      )}
      {tab === 'pantry' && (
        <PantryTab
          savedPantry={state.pantry}
          onSavePantry={handleSavePantry}
          onLogMeal={handleLogPantryMeal}
          remainingTargets={remainingTargets}
        />
      )}
      {tab === 'shopping' && (
        <ShoppingListTab list={shoppingList} checked={state.shoppingChecked} onToggle={handleToggleShopItem} />
      )}
      {tab === 'settings' && (
        <SettingsTab
          profile={state.profile}
          userEmail={session.user.email}
          onEdit={() => setState(s => ({ ...s, profile: null }))}
          onReset={handleReset}
          onSignOut={handleSignOut}
        />
      )}

      <div className="tabbar">
        <div className="tabbar-inner">
          <button className={`tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
            <span className="tab-icon">◉</span>Today
          </button>
          <button className={`tab ${tab === 'plan' ? 'active' : ''}`} onClick={() => setTab('plan')}>
            <span className="tab-icon">▤</span>Plan
          </button>
          <button className={`tab ${tab === 'pantry' ? 'active' : ''}`} onClick={() => setTab('pantry')}>
            <span className="tab-icon">✻</span>Pantry
          </button>
          <button className={`tab ${tab === 'shopping' ? 'active' : ''}`} onClick={() => setTab('shopping')}>
            <span className="tab-icon">▦</span>Shop
          </button>
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <span className="tab-icon">⚙</span>Settings
          </button>
        </div>
      </div>
    </>
  )
}
