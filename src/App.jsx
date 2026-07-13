import React, { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient.js'
import AuthScreen from './components/AuthScreen.jsx'
import Onboarding from './components/Onboarding.jsx'
import Dashboard from './components/Dashboard.jsx'
import MealPlanTab from './components/MealPlanTab.jsx'
import PantryTab from './components/PantryTab.jsx'
import ProgressTab from './components/ProgressTab.jsx'
import ShoppingListTab from './components/ShoppingListTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'
import CoachDashboard from './components/CoachDashboard.jsx'
import AdminFeedbackTab from './components/AdminFeedbackTab.jsx'
import { loadState, saveState, todayKey, defaultState } from './lib/storage.js'
import { generatePlan, generateShoppingList, regenerateDayMeal, swapDayMeal, removeMealAt, addExtraItem, replaceMealAt } from './lib/mealPlanner.js'
import { calculateTargets } from './lib/calculations.js'
import { amICoach } from './lib/coaching.js'
import { useOnlineStatus } from './lib/useOnlineStatus.js'
import { useTodayKey } from './lib/useTodayKey.js'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [state, setState] = useState(defaultState)
  const [stateLoading, setStateLoading] = useState(true)
  const [tab, setTab] = useState('dashboard')
  const [recipeToEdit, setRecipeToEdit] = useState(null)
  const [isCoach, setIsCoach] = useState(false)
  const [dataSource, setDataSource] = useState('server') // 'server' | 'pending' | 'cache' | 'default'
  const [synced, setSynced] = useState(true)
  const isOnline = useOnlineStatus()
  const saveTimer = useRef(null)
  // Reactive "today" — re-renders the Today tab automatically at midnight
  // (and when the tab regains focus/visibility) instead of freezing on
  // whatever day it was when the app first loaded.
  const today = useTodayKey()

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
      setIsCoach(false)
      return
    }
    setStateLoading(true)
    loadState(session.user.id).then(({ state: loaded, source }) => {
      setState(loaded)
      setDataSource(source)
      setSynced(source === 'server')
      setStateLoading(false)
    })
    amICoach(session.user.id).then(coach => setIsCoach(!!coach))
  }, [session?.user?.id])

  // Debounced save to Supabase on any state change (after initial load)
  useEffect(() => {
    if (!session || stateLoading) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveState(session.user.id, state, session.user.email).then(({ synced: ok }) => setSynced(ok))
    }, 600)
    return () => clearTimeout(saveTimer.current)
  }, [state, session?.user?.id, stateLoading])

  // The moment connectivity comes back, immediately retry syncing whatever's
  // currently in memory (which already includes any queued pending save,
  // since that's what got loaded in) rather than waiting for the next edit.
  useEffect(() => {
    if (!isOnline || !session || stateLoading || synced) return
    saveState(session.user.id, state, session.user.email).then(({ synced: ok }) => setSynced(ok))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline])

  function handleOnboardingComplete(profile) {
    setState(s => ({ ...s, profile }))
  }

  // Stamps every entry with the moment it was actually logged — the entry
  // still lives under state.log[today] (that's what ties it to a specific
  // calendar day), but loggedAt gives an exact time so "logged today" is
  // never ambiguous even right around a midnight rollover, and lets the
  // Today tab show when each item was logged.
  //
  // Also gives every entry a base* snapshot + portion:100 baseline (unless
  // it already carries its own, e.g. a plan meal logged at a scaled amount) —
  // this is what the Today tab's portion slider adjusts against, so dragging
  // back to 100% always exactly restores the originally-logged amount instead
  // of drifting from repeated rescale-and-round passes.
  function handleAddEntry(entry) {
    const key = today
    const tagged = {
      loggedAt: new Date().toISOString(),
      baseCalories: entry.calories, baseProtein: entry.protein, baseCarbs: entry.carbs, baseFat: entry.fat,
      portion: 100,
      ...entry,
    }
    setState(s => ({ ...s, log: { ...s.log, [key]: [...(s.log[key] || []), tagged] } }))
  }

  function handleRemoveEntry(id) {
    const key = today
    setState(s => ({ ...s, log: { ...s.log, [key]: (s.log[key] || []).filter(e => e.id !== id) } }))
  }

  // Adjusts a logged entry in place — used by the Today tab's portion slider
  // to rescale calories/protein/carbs/fat on an already-logged item without
  // creating a new entry or losing its original loggedAt timestamp.
  function handleEditEntry(id, patch) {
    const key = today
    setState(s => ({
      ...s,
      log: { ...s.log, [key]: (s.log[key] || []).map(e => (e.id === id ? { ...e, ...patch } : e)) },
    }))
  }

  // Builds the single object every meal-selection function reads from — one
  // place that assembles safety filters (allergies, dietary framework),
  // preference scoring (tags, ingredients, lifestyle), and the person's own
  // saved recipes, so every call site stays in sync automatically.
  function buildPersonSettings(s) {
    const p = s.profile || {}
    return {
      likedTags: p.likedTags || [],
      dislikedTags: p.dislikedTags || [],
      likedIngredients: p.likedIngredients || [],
      dislikedIngredients: p.dislikedIngredients || [],
      allergies: p.allergies || [],
      dietaryFramework: p.dietaryFramework || 'none',
      leftoverTolerance: p.leftoverTolerance,
      lunchTemperature: p.lunchTemperature,
      customMeals: s.customRecipes || [],
    }
  }

  function handleRegeneratePlan(days, startDate) {
    setState(s => {
      const plan = generatePlan({ targets: s.profile.targets, personSettings: buildPersonSettings(s), days, startDate })
      return { ...s, plan, shoppingChecked: {} }
    })
  }

  function handleCancelPlan() {
    setState(s => ({ ...s, plan: null, shoppingChecked: {} }))
  }

  // General-purpose "change this meal" — works on a core meal, an extra
  // meal, or a side, replacing it in place with whatever the person picked
  // from the Plan tab's swap panel (pantry match, a saved recipe, the built-in
  // meal database, or a web search result).
  function handleReplaceMeal(dayNumber, index, item, kind) {
    setState(s => {
      const dayIdx = s.plan.findIndex(d => d.day === dayNumber)
      if (dayIdx === -1) return s
      const newDay = replaceMealAt({ day: s.plan[dayIdx], index, item, kind })
      const newPlan = [...s.plan]
      newPlan[dayIdx] = newDay
      return { ...s, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleToggleShopItem(key) {
    setState(s => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [key]: !s.shoppingChecked[key] } }))
  }

  function handleClearShopChecks() {
    setState(s => ({ ...s, shoppingChecked: {} }))
  }

  function handleRegenerateMeal(dayNumber, mealIndex) {
    setState(s => {
      const dayIdx = s.plan.findIndex(d => d.day === dayNumber)
      if (dayIdx === -1) return s
      const newDay = regenerateDayMeal({
        day: s.plan[dayIdx],
        mealIndex,
        targets: s.profile.targets,
        personSettings: buildPersonSettings(s),
      })
      const newPlan = [...s.plan]
      newPlan[dayIdx] = newDay
      return { ...s, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleSwapMeal(dayNumber, mealIndex, replacement) {
    setState(s => {
      const dayIdx = s.plan.findIndex(d => d.day === dayNumber)
      if (dayIdx === -1) return s
      const newDay = swapDayMeal({
        day: s.plan[dayIdx],
        mealIndex,
        replacement,
        targets: s.profile.targets,
        personSettings: buildPersonSettings(s),
      })
      const newPlan = [...s.plan]
      newPlan[dayIdx] = newDay
      return { ...s, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleRemoveMeal(dayNumber, index) {
    setState(s => {
      const dayIdx = s.plan.findIndex(d => d.day === dayNumber)
      if (dayIdx === -1) return s
      const newDay = removeMealAt({ day: s.plan[dayIdx], index })
      const newPlan = [...s.plan]
      newPlan[dayIdx] = newDay
      return { ...s, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleAddExtra(dayNumber, item, kind) {
    setState(s => {
      const dayIdx = s.plan.findIndex(d => d.day === dayNumber)
      if (dayIdx === -1) return s
      const newDay = addExtraItem({ day: s.plan[dayIdx], item, kind })
      const newPlan = [...s.plan]
      newPlan[dayIdx] = newDay
      return { ...s, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleSaveCustomFood(food) {
    setState(s => {
      const exists = s.customFoods.some(f => f.name === food.name && f.calories === food.calories)
      if (exists) return s
      return { ...s, customFoods: [food, ...s.customFoods].slice(0, 100) }
    })
  }

  function handleDeleteCustomFood(id) {
    setState(s => ({ ...s, customFoods: s.customFoods.filter(f => f.id !== id) }))
  }

  function handleSaveRecipe(recipe) {
    setState(s => {
      const exists = s.customRecipes.some(r => r.id === recipe.id)
      const customRecipes = exists
        ? s.customRecipes.map(r => (r.id === recipe.id ? recipe : r))
        : [recipe, ...s.customRecipes]
      return { ...s, customRecipes }
    })
  }

  function handleDeleteRecipe(id) {
    setState(s => ({ ...s, customRecipes: s.customRecipes.filter(r => r.id !== id) }))
  }

  function handleEditRecipe(recipe) {
    setRecipeToEdit(recipe)
    setTab('pantry')
  }

  // Grows the person's personal product cache every time a barcode scan or
  // web search result actually gets used, so future lookups for the same
  // item resolve instantly and locally instead of hitting the network again.
  function handleRecordDiscoveredProduct(product) {
    setState(s => {
      if (s.discoveredProducts.some(p => p.id === product.id)) return s
      return { ...s, discoveredProducts: [product, ...s.discoveredProducts].slice(0, 300) }
    })
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
    if (confirm('This permanently deletes EVERYTHING — profile, log, meal plan, pantry, custom recipes, progress history, and water tracking. This cannot be undone. Continue?')) {
      setState({ ...defaultState })
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) alert("Couldn't sign out — check your connection and try again.")
  }

  function handleSelectCoach(coachId) {
    setState(s => ({ ...s, profile: { ...s.profile, coachId } }))
  }

  function handleUpdateSafetyProfile(patch) {
    setState(s => {
      const newProfile = { ...s.profile, ...patch }
      const newPlan = s.plan ? generatePlan({ targets: newProfile.targets, personSettings: buildPersonSettings({ ...s, profile: newProfile }), days: s.plan.length }) : s.plan
      return { ...s, profile: newProfile, plan: newPlan, shoppingChecked: {} }
    })
  }

  function handleChangeWater(delta) {
    const key = today
    setState(s => {
      const current = s.water[key] || 0
      const next = Math.max(0, current + delta)
      return { ...s, water: { ...s.water, [key]: next } }
    })
  }

  function handleAddBodyMetric(entry) {
    setState(s => ({ ...s, bodyMetrics: [...s.bodyMetrics, entry] }))
  }

  function handleDeleteBodyMetric(id) {
    setState(s => ({ ...s, bodyMetrics: s.bodyMetrics.filter(e => e.id !== id) }))
  }

  // Applies a confirmed goal-plan selection: overwrites active targets with the
  // goal-plan-adjusted numbers and, if a meal plan already exists, regenerates
  // it against the new target so everything stays in sync automatically.
  function handleStartGoalPlan({ goalPlanCore, preview }) {
    setState(s => {
      const goalPlan = {
        status: 'active',
        type: goalPlanCore.type,
        targetChangeLbs: goalPlanCore.targetChangeLbs,
        weeks: goalPlanCore.weeks,
        tierKey: goalPlanCore.tierKey,
        startDate: todayKey(),
        dailyCalorieChange: preview.dailyCalorieChange,
        wiggleRoom: preview.wiggleRoom,
        weeklyRateLbs: preview.weeklyRateLbs,
        isAggressive: preview.isAggressive,
      }
      const targets = { bmr: preview.bmr, tdee: preview.tdee, calories: preview.calories, protein: preview.protein, carbs: preview.carbs, fat: preview.fat }
      const newProfile = { ...s.profile, goalPlan, targets }
      const newPlan = s.plan ? generatePlan({ targets, personSettings: buildPersonSettings({ ...s, profile: newProfile }), days: s.plan.length }) : s.plan
      return { ...s, profile: newProfile, plan: newPlan, shoppingChecked: {} }
    })
  }

  // Reverts to the flat percentage-based goal from onboarding and, again,
  // regenerates the meal plan to match if one exists.
  function handleStopGoalPlan() {
    setState(s => {
      const targets = calculateTargets({
        sex: s.profile.sex,
        weightKg: s.profile.weightKg,
        heightCm: s.profile.heightCm,
        age: s.profile.age,
        activityKey: s.profile.activityKey,
        goalKey: s.profile.goalKey,
        eatingStyle: s.profile.eatingStyle,
      })
      const newProfile = { ...s.profile, goalPlan: null, targets }
      const newPlan = s.plan ? generatePlan({ targets, personSettings: buildPersonSettings({ ...s, profile: newProfile }), days: s.plan.length }) : s.plan
      return { ...s, profile: newProfile, plan: newPlan, shoppingChecked: {} }
    })
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

  // Gates the beta feedback admin tab to just the app owner — matches the
  // Supabase RLS policy on the feedback table (auth.jwt()->>'email'), so
  // this is purely a UI convenience; the real restriction is server-side.
  const isOwner = session.user.email === 'chadp35@gmail.com'

  const todaysEntries = state.log[today] || []
  // Today's plan card should reflect whichever plan day is actually today's
  // calendar date — not always array index 0, which used to mean "today's
  // meals" silently kept showing Day 1 forever, even after Day 1's date had
  // passed. Plans saved before per-day dates existed fall back to index 0.
  const hasDatedDays = !!state.plan?.[0]?.date
  const todaysPlanDay = state.plan ? (hasDatedDays ? state.plan.find(d => d.date === today) : state.plan[0]) : null
  const todaysPlanMeals = todaysPlanDay?.meals || null
  const shoppingList = state.plan ? generateShoppingList(state.plan) : []
  const personSettings = buildPersonSettings(state)

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
            <div className="brand-mark">S</div>
            <h1>Strong Nutes</h1>
          </div>
        </div>
        {!isOnline && (
          <div className="offline-banner">
            You're offline — {dataSource === 'cache' ? 'showing your last saved data. ' : ''}
            Changes are saved on this device and will sync once you're back online.
          </div>
        )}
        {isOnline && !synced && (
          <div className="offline-banner">
            Reconnecting to sync your changes…
          </div>
        )}
      </div>

      {tab === 'dashboard' && (
        <Dashboard
          profile={state.profile}
          todaysEntries={todaysEntries}
          onAddEntry={handleAddEntry}
          onRemoveEntry={handleRemoveEntry}
          onEditEntry={handleEditEntry}
          todaysPlanMeals={todaysPlanMeals}
          todaysPlanDay={todaysPlanDay}
          onReplaceMeal={handleReplaceMeal}
          onRegenerateMeal={handleRegenerateMeal}
          onSwapMeal={handleSwapMeal}
          onRemoveMeal={handleRemoveMeal}
          targets={state.profile.targets}
          savedPantry={state.pantry}
          personSettings={personSettings}
          customFoods={state.customFoods}
          onSaveCustomFood={handleSaveCustomFood}
          onDeleteCustomFood={handleDeleteCustomFood}
          todaysWater={state.water[today] || 0}
          onChangeWater={handleChangeWater}
          customRecipes={state.customRecipes}
          discoveredProducts={state.discoveredProducts}
          onRecordDiscovered={handleRecordDiscoveredProduct}
        />
      )}
      {tab === 'plan' && (
        <MealPlanTab
          plan={state.plan}
          onRegenerate={handleRegeneratePlan}
          onCancelPlan={handleCancelPlan}
          onRegenerateMeal={handleRegenerateMeal}
          onSwapMeal={handleSwapMeal}
          onRemoveMeal={handleRemoveMeal}
          onAddExtra={handleAddExtra}
          onReplaceMeal={handleReplaceMeal}
          targets={state.profile.targets}
          savedPantry={state.pantry}
          personSettings={personSettings}
          customRecipes={state.customRecipes}
          discoveredProducts={state.discoveredProducts}
          onRecordDiscovered={handleRecordDiscoveredProduct}
        />
      )}
      {tab === 'pantry' && (
        <PantryTab
          savedPantry={state.pantry}
          onSavePantry={handleSavePantry}
          onLogMeal={handleLogPantryMeal}
          remainingTargets={remainingTargets}
          allergies={state.profile.allergies || []}
          onSaveRecipe={handleSaveRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          personSettings={personSettings}
          customRecipes={state.customRecipes}
          discoveredProducts={state.discoveredProducts}
          onRecordDiscovered={handleRecordDiscoveredProduct}
          recipeToEdit={recipeToEdit}
          onClearRecipeToEdit={() => setRecipeToEdit(null)}
        />
      )}
      {tab === 'progress' && (
        <ProgressTab
          bodyMetrics={state.bodyMetrics}
          onAddEntry={handleAddBodyMetric}
          onDeleteEntry={handleDeleteBodyMetric}
          myUserId={session.user.id}
          hasCoach={!!state.profile.coachId}
        />
      )}
      {tab === 'shopping' && (
        <ShoppingListTab list={shoppingList} checked={state.shoppingChecked} onToggle={handleToggleShopItem} onClearChecks={handleClearShopChecks} />
      )}
      {tab === 'coach' && isCoach && (
        <CoachDashboard myUserId={session.user.id} />
      )}
      {tab === 'feedback' && isOwner && (
        <AdminFeedbackTab />
      )}
      {tab === 'settings' && (
        <SettingsTab
          profile={state.profile}
          userEmail={session.user.email}
          userId={session.user.id}
          onEdit={() => setState(s => ({ ...s, profile: null }))}
          onReset={handleReset}
          onSignOut={handleSignOut}
          onStartGoalPlan={handleStartGoalPlan}
          onStopGoalPlan={handleStopGoalPlan}
          fullState={state}
          onSelectCoach={handleSelectCoach}
          onUpdateSafetyProfile={handleUpdateSafetyProfile}
          customRecipes={state.customRecipes}
          onDeleteRecipe={handleDeleteRecipe}
          onEditRecipe={handleEditRecipe}
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
          <button className={`tab ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>
            <span className="tab-icon">📈</span>Progress
          </button>
          <button className={`tab ${tab === 'shopping' ? 'active' : ''}`} onClick={() => setTab('shopping')}>
            <span className="tab-icon">▦</span>Shop
          </button>
          {isCoach && (
            <button className={`tab ${tab === 'coach' ? 'active' : ''}`} onClick={() => setTab('coach')}>
              <span className="tab-icon">👥</span>Coach
            </button>
          )}
          {isOwner && (
            <button className={`tab ${tab === 'feedback' ? 'active' : ''}`} onClick={() => setTab('feedback')}>
              <span className="tab-icon">🐞</span>Feedback
            </button>
          )}
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <span className="tab-icon">⚙</span>Settings
          </button>
        </div>
      </div>
    </>
  )
}
