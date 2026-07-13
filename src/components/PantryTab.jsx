import React, { Suspense, useEffect, useState, lazy } from 'react'
import { matchPantryToMeals, suggestPantryCombo, formatIngredient } from '../lib/mealPlanner.js'
import { CHAINS, findStoreOptions } from '../data/storeSnacks.js'
import { searchIngredients } from '../lib/recipeBuilder.js'
import { searchBrandedFoods, getProductByBarcode } from '../lib/openFoodFacts.js'
import { searchLocalProducts } from '../lib/localProductSearch.js'
import BulkPrepControls from './BulkPrepControls.jsx'
import BarcodeScanner from './BarcodeScanner.jsx'

const RecipeBuilder = lazy(() => import('./RecipeBuilder.jsx'))

const TYPE_OPTIONS = [
  { key: 'any', label: 'Any meal' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
]

const MODES = [
  { key: 'kitchen', label: 'My Pantry' },
  { key: 'onthego', label: 'On the Go' },
  { key: 'recipe', label: 'My Recipe' },
]

export default function PantryTab({
  savedPantry, onSavePantry, onLogMeal, remainingTargets, allergies, onSaveRecipe, personSettings,
  customRecipes, discoveredProducts, onRecordDiscovered, onDeleteRecipe, recipeToEdit, onClearRecipeToEdit,
}) {
  const [mode, setMode] = useState('kitchen') // 'kitchen' | 'onthego' | 'recipe'
  const [builderTarget, setBuilderTarget] = useState(null) // null = list, 'new' = blank builder, or a recipe object = edit

  // Jumping here from Settings' "Edit" button on a recipe
  useEffect(() => {
    if (recipeToEdit) {
      setMode('recipe')
      setBuilderTarget(recipeToEdit)
    }
  }, [recipeToEdit])

  function closeBuilder() {
    setBuilderTarget(null)
    onClearRecipeToEdit?.()
  }

  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {MODES.map(m => (
          <button
            key={m.key}
            className="secondary"
            style={{
              flex: 1, fontWeight: 700, fontSize: 13,
              background: mode === m.key ? 'var(--fuel)' : 'var(--surface-2)',
              color: mode === m.key ? 'var(--on-fuel)' : 'var(--text)',
              borderColor: mode === m.key ? 'var(--fuel)' : 'var(--border)',
            }}
            onClick={() => { setMode(m.key); if (m.key !== 'recipe') closeBuilder() }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'kitchen' && (
        <KitchenMode
          savedPantry={savedPantry}
          onSavePantry={onSavePantry}
          onLogMeal={onLogMeal}
          remainingTargets={remainingTargets}
          personSettings={personSettings}
          discoveredProducts={discoveredProducts}
          onRecordDiscovered={onRecordDiscovered}
        />
      )}
      {mode === 'onthego' && (
        <OnTheGoMode onLogMeal={onLogMeal} remainingTargets={remainingTargets} personSettings={personSettings} />
      )}
      {mode === 'recipe' && !builderTarget && (
        <div>
          {customRecipes?.length > 0 && (
            <div className="card">
              <h2>Your recipes</h2>
              {customRecipes.map(r => (
                <div className="log-entry" key={r.id}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onLogMeal(r)}>
                    <div className="meal-name">{r.name}</div>
                    <div className="meal-macros">{r.calories} kcal · {r.type} · tap to log</div>
                  </div>
                  <button className="secondary" style={{ marginRight: 8 }} onClick={() => setBuilderTarget(r)}>Edit</button>
                  <button className="remove-btn" onClick={() => onDeleteRecipe(r.id)}>×</button>
                </div>
              ))}
            </div>
          )}
          <button className="primary" style={{ width: '100%' }} onClick={() => setBuilderTarget('new')}>+ New recipe</button>
        </div>
      )}
      {mode === 'recipe' && builderTarget && (
        <Suspense fallback={<p className="muted small">Loading recipe builder…</p>}>
          <RecipeBuilder
            // Forces a full remount whenever the target recipe changes —
            // without this, React can reuse the same component instance
            // across two different recipes and keep the FIRST recipe's
            // ingredient lines in state instead of loading the new one's.
            key={builderTarget === 'new' ? 'new' : builderTarget.id}
            allergies={allergies}
            discoveredProducts={discoveredProducts}
            onRecordDiscovered={onRecordDiscovered}
            onSaveRecipe={(recipe) => { onSaveRecipe(recipe); closeBuilder() }}
            onDone={closeBuilder}
            existingRecipe={builderTarget === 'new' ? undefined : builderTarget}
          />
        </Suspense>
      )}
    </div>
  )
}

function KitchenMode({ savedPantry, onSavePantry, onLogMeal, remainingTargets, personSettings, discoveredProducts, onRecordDiscovered }) {
  const [pantryText, setPantryText] = useState(savedPantry.join('\n'))
  const [type, setType] = useState('any')
  const [results, setResults] = useState(null)
  const [combo, setCombo] = useState(null)
  const [searched, setSearched] = useState(false)

  function addItemName(name) {
    const nextText = pantryText.trim() ? `${pantryText.trim()}\n${name}` : name
    setPantryText(nextText)
    onSavePantry(nextText.split(/[,\n]/).map(s => s.trim()).filter(Boolean))
  }

  function handleFind() {
    const items = pantryText.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    onSavePantry(items)
    setResults(matchPantryToMeals(pantryText, { type, personSettings }))
    setCombo(suggestPantryCombo(pantryText))
    setSearched(true)
  }

  return (
    <div>
      <p className="muted small" style={{ marginBottom: 16 }}>
        List what you've got — one item per line or comma-separated, or scan/search below to add items instantly. I'll find meals built for your macros that use it.
      </p>

      <PantryItemFinder discoveredProducts={discoveredProducts} onRecordDiscovered={onRecordDiscovered} onAdd={addItemName} />

      <div className="card">
        <div className="field">
          <label>Pantry / fridge items</label>
          <textarea
            value={pantryText}
            onChange={e => setPantryText(e.target.value)}
            placeholder={'chicken breast\nrice\nbroccoli\neggs\ngreek yogurt'}
            rows={5}
            style={{
              width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '11px 12px', borderRadius: 10, fontSize: 15,
              fontFamily: 'Inter', resize: 'vertical',
            }}
          />
        </div>
        <div className="field">
          <label>Filter by meal type</label>
          <select value={type} onChange={e => setType(e.target.value)}>
            {TYPE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
        <button className="primary" onClick={handleFind}>Find meals I can make</button>
      </div>

      {combo && !combo.isPartial && (
        <div className="card" style={{ borderColor: 'var(--fuel)', borderWidth: 1.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h2 style={{ marginBottom: 0, fontSize: 13, color: 'var(--fuel)' }}>Built from what you have</h2>
          </div>
          <p className="meal-name" style={{ fontSize: 17, marginBottom: 6 }}>{combo.name}</p>
          <p className="mono small" style={{ marginBottom: 10 }}>
            {combo.calories} kcal · P{combo.protein}g · C{combo.carbs}g · F{combo.fat}g per serving
          </p>
          <p className="meal-detail" style={{ marginBottom: 10 }}>{combo.recipe}</p>
          <p className="small" style={{ marginBottom: 10 }}>
            <strong>Uses:</strong> {combo.ingredients.map(formatIngredient).join(', ')}
          </p>
          <button className="secondary" onClick={() => onLogMeal(combo)}>Log this meal</button>
        </div>
      )}

      {combo && combo.isPartial && (
        <div className="card" style={{ background: 'var(--surface-2)' }}>
          <h2 style={{ fontSize: 13 }}>Almost there</h2>
          <p className="meal-detail">{combo.recipe}</p>
        </div>
      )}

      {searched && results && results.length === 0 && !combo && (
        <div className="empty-state">
          <h3>No matches</h3>
          <p className="small">Try adding a few more staples — even "rice" or "eggs" unlocks several meals.</p>
        </div>
      )}

      {results && results.map(({ meal, matched, missing, missingCount }) => (
        <div className="card" key={meal.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <h2 style={{ marginBottom: 0, fontSize: 16, color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>{meal.name}</h2>
            <span className="mono small" style={{ color: missingCount === 0 ? 'var(--fuel)' : 'var(--muted)' }}>
              {missingCount === 0 ? 'You have this ✓' : `Just grab: ${missing.length}`}
            </span>
          </div>
          <p className="meal-type" style={{ marginBottom: 10 }}>{meal.type}</p>
          <p className="mono small" style={{ marginBottom: 10 }}>
            {meal.calories} kcal · P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g per serving
          </p>

          {missing.length > 0 && (
            <p className="small" style={{ marginBottom: 10 }}>
              <strong>Just grab:</strong> {missing.map(formatIngredient).join(', ')}
            </p>
          )}

          <p className="meal-detail" style={{ marginBottom: 4 }}>{meal.recipe}</p>
          <BulkPrepControls meal={meal} />

          <button className="secondary" style={{ marginTop: 12 }} onClick={() => onLogMeal(meal)}>Log this meal</button>
        </div>
      ))}

      {remainingTargets && (
        <p className="muted small" style={{ textAlign: 'center' }}>
          Remaining today: {Math.max(remainingTargets.calories, 0)} kcal · {Math.max(remainingTargets.protein, 0)}g protein
        </p>
      )}
    </div>
  )
}

// Barcode scanner + full food database (local raw ingredients, your own
// previously discovered products, and a live Open Food Facts web search) for
// adding pantry items — the same lookup power as the recipe builder and food
// log, so building your pantry list doesn't mean typing everything by hand.
function PantryItemFinder({ discoveredProducts, onRecordDiscovered, onAdd }) {
  const [query, setQuery] = useState('')
  const [webResults, setWebResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [searchedWeb, setSearchedWeb] = useState(false)
  const [justAdded, setJustAdded] = useState('')

  const localIngredients = searchIngredients(query)
  const localProducts = searchLocalProducts(query, discoveredProducts)

  async function searchWeb() {
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    setSearchedWeb(true)
    try {
      setWebResults(await searchBrandedFoods(query))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function addAndClear(name, product) {
    onAdd(name)
    if (product) onRecordDiscovered?.(product)
    setQuery('')
    setWebResults([])
    setSearchedWeb(false)
    setJustAdded(name)
    setTimeout(() => setJustAdded(''), 2500)
  }

  async function handleBarcodeDetected(code) {
    setScanning(false)
    setLoading(true)
    setError('')
    try {
      const product = await getProductByBarcode(code)
      addAndClear(product.brand ? `${product.name} (${product.brand})` : product.name, product)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (scanning) {
    return <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
  }

  return (
    <div className="card" style={{ background: 'var(--surface-2)' }}>
      <h2>Add an item</h2>
      <div className="field">
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search the food database, e.g. chicken breast or Great Value rice"
          onKeyDown={e => e.key === 'Enter' && searchWeb()}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="secondary" style={{ flex: 1 }} onClick={() => setScanning(true)}>📷 Scan barcode</button>
        <button className="secondary" style={{ flex: 1 }} onClick={searchWeb} disabled={loading}>🌐 Search web</button>
      </div>

      {justAdded && <p className="small" style={{ color: 'var(--fuel)', marginBottom: 10 }}>Added "{justAdded}" to your pantry.</p>}

      {localIngredients.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p className="muted small" style={{ marginBottom: 6 }}>Raw ingredients</p>
          {localIngredients.map(ing => (
            <div className="meal-row" style={{ cursor: 'pointer' }} key={ing.id} onClick={() => addAndClear(ing.name)}>
              <div className="meal-name">{ing.name}</div>
              <span className="meal-macros">{ing.per100g.calories} kcal/100g</span>
            </div>
          ))}
        </div>
      )}

      {localProducts.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p className="muted small" style={{ marginBottom: 6 }}>Branded products</p>
          {localProducts.map(p => (
            <div className="meal-row" style={{ cursor: 'pointer' }} key={p.id} onClick={() => addAndClear(p.brand ? `${p.name} (${p.brand})` : p.name, p)}>
              <div>
                <div className="meal-name">{p.name}</div>
                <div className="meal-type">{p.brand}</div>
              </div>
              <span className="meal-macros">{p.caloriesPer100g} kcal/100g</span>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="muted small">{query.trim() ? 'Searching…' : 'Looking up barcode…'}</p>}
      {error && <p className="small" style={{ color: 'var(--danger)' }}>{error}</p>}
      {searchedWeb && !loading && webResults.length === 0 && (
        <p className="muted small">No web matches. Try a shorter or more generic term.</p>
      )}
      {webResults.length > 0 && (
        <div>
          <p className="muted small" style={{ marginBottom: 6 }}>From the web</p>
          {webResults.map(food => (
            <div className="meal-row" style={{ cursor: 'pointer' }} key={food.id} onClick={() => addAndClear(food.brand ? `${food.name} (${food.brand})` : food.name, food)}>
              <div>
                <div className="meal-name">{food.name}</div>
                <div className="meal-type">{food.brand || 'Branded food'}</div>
              </div>
              <span className="meal-macros">{food.caloriesPer100g} kcal/100g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OnTheGoMode({ onLogMeal, remainingTargets, personSettings }) {
  const [chainKey, setChainKey] = useState('7eleven')
  const [mealType, setMealType] = useState('any')
  const [results, setResults] = useState(null)

  const chain = CHAINS.find(c => c.key === chainKey)

  function find() {
    setResults(findStoreOptions({
      chainKey,
      mealType,
      remainingCalories: remainingTargets?.calories,
      remainingProtein: remainingTargets?.protein,
      personSettings,
    }))
  }

  return (
    <div>
      <p className="muted small" style={{ marginBottom: 4 }}>
        Generally available picks by chain — not live inventory for one specific location, so double-check the label. Ranked to fit what's left in your day.
      </p>
      {remainingTargets && (
        <p className="mono small muted" style={{ marginBottom: 16 }}>
          Remaining today: {Math.max(Math.round(remainingTargets.calories), 0)} kcal · {Math.max(Math.round(remainingTargets.protein), 0)}g protein
        </p>
      )}

      <div className="card">
        <div className="field">
          <label>Where are you?</label>
          <select value={chainKey} onChange={e => setChainKey(e.target.value)}>
            {CHAINS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {chain?.note && <p className="muted small" style={{ marginTop: 6, marginBottom: 0 }}>{chain.note}</p>}
        </div>
        <div className="field">
          <label>Looking for</label>
          <select value={mealType} onChange={e => setMealType(e.target.value)}>
            <option value="any">Anything</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">A real meal</option>
            <option value="snack">Just a snack</option>
          </select>
        </div>
        <button className="primary" onClick={find}>Find options</button>
      </div>

      {results && results.length === 0 && (
        <div className="empty-state">
          <h3>Nothing quite fits</h3>
          <p className="small">Try "Anything" for the meal filter, or a nearby chain type.</p>
        </div>
      )}

      {results && results.map(item => (
        <div className="meal-row" key={item.id}>
          <div>
            <div className="meal-name">{item.name}</div>
            <div className="meal-macros">{item.calories} kcal · P{item.protein}g · C{item.carbs}g · F{item.fat}g</div>
          </div>
          <button className="secondary" onClick={() => onLogMeal(item)}>Log it</button>
        </div>
      ))}
    </div>
  )
}
