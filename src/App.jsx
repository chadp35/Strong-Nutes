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
import { loadState, saveState, todayKey, defaultState } from './lib/storage.js'
import { generatePlan, generateShoppingList, regenerateDayMeal, swapDayMeal, removeMealAt, addExtraItem } from './lib/mealPlanner.js'
import { calculateTargets } from './lib/calculations.js'
import { amICoach } from './lib/coaching.js'
import { useOnlineStatus } from './lib/useOnlineStatus.js'

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

  function handleAddEntry(entry) {
    const key = todayKey()
    setState(s => ({ ...s, log: { ...s.log, [key]: [...(s.log[key] || []), entry] } }))
  }

  function handleRemoveEntry(id) {
    const key = todayKey()
    setState(s => ({ ...s, log: { ...s.log, [key]: (s.log[key] || []).filter(e => e.id !== id) } }))
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

  function handleRegeneratePlan(days) {
    setState(s => {
      const plan = generatePlan({ targets: s.profile.targets, personSettings: buildPersonSettings(s), days })
      return { ...s, plan, shoppingChecked: {} }
    })
  }

  function handleToggleShopItem(key) {
    setState(s => ({ ...s, shoppingChecked: { ...s.shoppingChecked, [key]: !s.shoppingChecked[key] } }))
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
    if (confirm('This clears your profile, log, and meal plan. Continue?')) {
      setState({ ...defaultState })
    }
  }

  function handleSignOut() {
    supabase.auth.signOut()
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
    const key = todayKey()
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

  const todaysEntries = state.log[todayKey()] || []
  const todaysPlanMeals = state.plan?.[0]?.meals || null
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
          todaysPlanMeals={todaysPlanMeals}
          customFoods={state.customFoods}
          onSaveCustomFood={handleSaveCustomFood}
          onDeleteCustomFood={handleDeleteCustomFood}
          todaysWater={state.water[todayKey()] || 0}
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
          onRegenerateMeal={handleRegenerateMeal}
          onSwapMeal={handleSwapMeal}
          onRemoveMeal={handleRemoveMeal}
          onAddExtra={handleAddExtra}
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
        <ShoppingListTab list={shoppingList} checked={state.shoppingChecked} onToggle={handleToggleShopItem} />
      )}
      {tab === 'coach' && isCoach && (
        <CoachDashboard myUserId={session.user.id} />
      )}
      {tab === 'settings' && (
        <SettingsTab
          profile={state.profile}
          userEmail={session.user.email}
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
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <span className="tab-icon">⚙</span>Settings
          </button>
        </div>
      </div>
    </>
  )
}
