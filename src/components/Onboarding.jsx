import React, { useMemo, useState } from 'react'
import { calculateTargets, lbsToKg, ftInToCm, ACTIVITY_MULTIPLIERS, GOALS, EATING_STYLES } from '../lib/calculations.js'
import { ALLERGEN_OPTIONS, DIETARY_FRAMEWORK_OPTIONS } from '../data/allergens.js'
import { localDateKey } from '../lib/dateKey.js'
import GoalPlanner from './GoalPlanner.jsx'

const PLACEHOLDER = { weightLbs: 170, feet: 5, inches: 8, age: 30 }
const TOTAL_STEPS = 9

const PROTEIN_ITEMS = ['Chicken breast', 'Chicken thighs', 'Turkey', 'Lean beef', 'Pork', 'Whole eggs', 'Egg whites', 'Lamb', 'Bison']
const SEAFOOD_ITEMS = ['White fish', 'Salmon', 'Tuna', 'Shrimp', 'Crab', 'Lobster', 'Mussels', 'Clams', 'Oysters']
const PLANT_PROTEIN_ITEMS = ['Tofu', 'Tempeh', 'Seitan', 'Lentils', 'Black beans', 'Kidney beans', 'Chickpeas', 'Edamame']
const CARB_ITEMS = ['Oatmeal', 'White rice', 'Brown rice', 'Quinoa', 'Couscous', 'White potatoes', 'Sweet potatoes', 'Pasta', 'Bread', 'Tortillas']
const VEGGIE_ITEMS = ['Broccoli', 'Cauliflower', 'Brussels sprouts', 'Cabbage', 'Spinach', 'Kale', 'Arugula', 'Onions', 'Garlic', 'Tomatoes', 'Bell peppers', 'Eggplant', 'Asparagus', 'Zucchini', 'Mushrooms', 'Cucumber', 'Carrots']
const FRUIT_ITEMS = ['Strawberries', 'Blueberries', 'Oranges', 'Grapefruit', 'Mango', 'Pineapple', 'Banana', 'Peaches', 'Cherries', 'Watermelon', 'Apples', 'Pears']
const DAIRY_ITEMS = ['Greek yogurt', 'Cottage cheese', 'Milk', 'Cheddar', 'Feta', 'Mozzarella', 'Almond milk', 'Oat milk']

function StepShell({ step, title, subtitle, onBack, onNext, nextLabel = 'Next', nextDisabled, children, showSkip }) {
  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <p className="muted small mono" style={{ marginBottom: 4 }}>Step {step + 1} of {TOTAL_STEPS}</p>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>{title}</h1>
      {subtitle && <p className="muted small" style={{ marginBottom: 16 }}>{subtitle}</p>}
      {children}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        {step > 0 && <button className="secondary" onClick={onBack}>Back</button>}
        <button className="primary" style={{ flex: 1, opacity: nextDisabled ? 0.5 : 1 }} disabled={nextDisabled} onClick={onNext}>
          {nextLabel}
        </button>
      </div>
      {showSkip && (
        <button className="secondary" style={{ width: '100%', marginTop: 8 }} onClick={onNext}>Skip this step</button>
      )}
    </div>
  )
}

function Chip({ active, activeClass = 'like', onClick, children }) {
  return (
    <div className={`tag-chip ${active ? activeClass : ''}`} onClick={onClick}>{children}</div>
  )
}

// A category of specific foods, tap once to like (green), tap again to
// dislike (red), tap a third time to clear — matches the questionnaire's
// "actively enjoy" vs "deal-breaker" structure at the individual-food level.
function IngredientCategory({ label, items, liked, disliked, onToggle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ marginBottom: 8 }}>{label}</label>
      <div className="tag-grid">
        {items.map(item => {
          const isLiked = liked.includes(item.toLowerCase())
          const isDisliked = disliked.includes(item.toLowerCase())
          return (
            <Chip
              key={item}
              active={isLiked || isDisliked}
              activeClass={isLiked ? 'like' : 'dislike'}
              onClick={() => onToggle(item)}
            >
              {item}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  // ---- Step 0: stats ----
  const [sex, setSex] = useState('male')
  const [weightLbs, setWeightLbs] = useState('')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [age, setAge] = useState('')
  const [activityKey, setActivityKey] = useState('moderate')
  const [goalKey, setGoalKey] = useState('maintain')

  const canSubmitStats =
    Number(weightLbs) > 0 && Number(weightLbs) < 800 &&
    feet !== '' && Number(feet) > 0 && Number(feet) < 9 &&
    (inches === '' || (Number(inches) >= 0 && Number(inches) < 12)) &&
    Number(age) > 0 && Number(age) < 120
  const isRealStats = weightLbs !== '' && feet !== '' && age !== ''

  const liveTargets = useMemo(() => {
    const w = weightLbs !== '' ? Number(weightLbs) : PLACEHOLDER.weightLbs
    const f = feet !== '' ? Number(feet) : PLACEHOLDER.feet
    const i = inches !== '' ? Number(inches) : PLACEHOLDER.inches
    const a = age !== '' ? Number(age) : PLACEHOLDER.age
    return calculateTargets({ sex, weightKg: lbsToKg(w), heightCm: ftInToCm(f, i), age: a, activityKey, goalKey })
  }, [sex, weightLbs, feet, inches, age, activityKey, goalKey])

  // ---- Step 1: timed goal ----
  const [goalPlanResult, setGoalPlanResult] = useState(null)

  // ---- Step 2: safety ----
  const [allergies, setAllergies] = useState([])
  const [dietaryFramework, setDietaryFramework] = useState('none')

  // ---- Step 3: eating style ----
  const [eatingStyle, setEatingStyle] = useState('none')

  // ---- Step 4: food preferences ----
  const [likedIngredients, setLikedIngredients] = useState([])
  const [dislikedIngredients, setDislikedIngredients] = useState([])

  function toggleIngredient(item) {
    const key = item.toLowerCase()
    if (likedIngredients.includes(key)) {
      setLikedIngredients(l => l.filter(x => x !== key))
      setDislikedIngredients(d => [...d, key])
    } else if (dislikedIngredients.includes(key)) {
      setDislikedIngredients(d => d.filter(x => x !== key))
    } else {
      setLikedIngredients(l => [...l, key])
    }
  }

  // ---- Step 5: texture & flavor ----
  const [textureAversions, setTextureAversions] = useState([])
  const [spiceTolerance, setSpiceTolerance] = useState('mild')
  const [sweetSavoryCombo, setSweetSavoryCombo] = useState('fine')
  const [cilantroSoap, setCilantroSoap] = useState(false)
  const [bitterTolerance, setBitterTolerance] = useState('tolerable')

  function toggleTexture(t) {
    setTextureAversions(ts => (ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]))
  }

  // ---- Step 6: lifestyle & kitchen ----
  const [leftoverTolerance, setLeftoverTolerance] = useState('twoDay')
  const [hatesReheated, setHatesReheated] = useState('')
  const [cookingComplexity, setCookingComplexity] = useState('moderate')
  const [convenienceLevel, setConvenienceLevel] = useState('balanced')
  const [lunchTemperature, setLunchTemperature] = useState('either')

  // ---- Step 7: beverages & non-negotiable ----
  const [coffeeNotes, setCoffeeNotes] = useState('')
  const [waterNotes, setWaterNotes] = useState('')
  const [sodaNotes, setSodaNotes] = useState('')
  const [alcoholNotes, setAlcoholNotes] = useState('')
  const [nonNegotiable, setNonNegotiable] = useState('')

  function handleSubmit() {
    const weightKg = lbsToKg(Number(weightLbs))
    const heightCm = ftInToCm(Number(feet), Number(inches || 0))
    const baseTargets = calculateTargets({ sex, weightKg, heightCm, age: Number(age), activityKey, goalKey, eatingStyle })

    let targets = baseTargets
    let goalPlan = null
    if (goalPlanResult) {
      const { goalPlanCore, preview } = goalPlanResult
      targets = { bmr: preview.bmr, tdee: preview.tdee, calories: preview.calories, protein: preview.protein, carbs: preview.carbs, fat: preview.fat }
      goalPlan = {
        status: 'active',
        type: goalPlanCore.type,
        targetChangeLbs: goalPlanCore.targetChangeLbs,
        weeks: goalPlanCore.weeks,
        tierKey: goalPlanCore.tierKey,
        startDate: localDateKey(),
        dailyCalorieChange: preview.dailyCalorieChange,
        wiggleRoom: preview.wiggleRoom,
        weeklyRateLbs: preview.weeklyRateLbs,
        isAggressive: preview.isAggressive,
      }
    }

    const finalDislikedIngredients = cilantroSoap ? [...new Set([...dislikedIngredients, 'cilantro'])] : dislikedIngredients

    const beverageParts = []
    if (coffeeNotes) beverageParts.push(`Coffee/tea: ${coffeeNotes}`)
    if (waterNotes) beverageParts.push(`Water: ${waterNotes}`)
    if (sodaNotes) beverageParts.push(`Soda/energy drinks: ${sodaNotes}`)
    if (alcoholNotes) beverageParts.push(`Alcohol: ${alcoholNotes}`)

    onComplete({
      sex, weightKg, heightCm, age: Number(age), activityKey, goalKey, eatingStyle,
      likedTags: [], dislikedTags: [],
      likedIngredients, dislikedIngredients: finalDislikedIngredients,
      allergies, dietaryFramework,
      textureAversions, spiceTolerance, sweetSavoryCombo, bitterTolerance,
      leftoverTolerance, hatesReheated, cookingComplexity, convenienceLevel, lunchTemperature,
      beverageNotes: beverageParts.join(' · '),
      nonNegotiable,
      targets, goalPlan,
    })
  }

  // ================= STEP 0: STATS =================
  if (step === 0) {
    return (
      <div className="app-shell" style={{ paddingTop: 20 }}>
        <p className="muted small mono" style={{ marginBottom: 4 }}>Step 1 of {TOTAL_STEPS}</p>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Let's set your targets</h1>
        <p className="muted small" style={{ marginBottom: 20 }}>Takes about a minute.</p>

        <div className="card">
          <h2>About you</h2>
          <div className="field">
            <label>Sex (for BMR calculation)</label>
            <select value={sex} onChange={e => setSex(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="row field">
            <div>
              <label>Weight (lbs)</label>
              <input type="number" value={weightLbs} onChange={e => setWeightLbs(e.target.value)} placeholder="180" />
            </div>
            <div>
              <label>Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="30" />
            </div>
          </div>
          <div className="row field">
            <div>
              <label>Height (ft)</label>
              <input type="number" value={feet} onChange={e => setFeet(e.target.value)} placeholder="5" />
            </div>
            <div>
              <label>Height (in)</label>
              <input type="number" value={inches} onChange={e => setInches(e.target.value)} placeholder="10" />
            </div>
          </div>
          <div className="field">
            <label>Activity level</label>
            <select value={activityKey} onChange={e => setActivityKey(e.target.value)}>
              {Object.entries(ACTIVITY_MULTIPLIERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Goal</label>
            <select value={goalKey} onChange={e => setGoalKey(e.target.value)}>
              {Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="card" style={{ borderColor: 'var(--fuel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="live-dot" />
            <h2 style={{ marginBottom: 0 }}>{isRealStats ? 'Your live targets' : 'Live preview — fill in your stats above'}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 14 }}>
            <span className="odometer" style={{ fontSize: 34, color: 'var(--fuel)' }}>{liveTargets.calories}</span>
            <span className="odometer-unit">kcal / day{isRealStats ? '' : ' (example)'}</span>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span className="mono small">BMR <strong style={{ color: 'var(--text)' }}>{liveTargets.bmr}</strong></span>
            <span className="mono small" style={{ color: 'var(--protein)' }}>P {liveTargets.protein}g</span>
            <span className="mono small" style={{ color: 'var(--carb)' }}>C {liveTargets.carbs}g</span>
            <span className="mono small" style={{ color: 'var(--fat)' }}>F {liveTargets.fat}g</span>
          </div>
        </div>

        <button className="primary" disabled={!canSubmitStats} style={{ opacity: canSubmitStats ? 1 : 0.5, width: '100%' }} onClick={next}>
          {canSubmitStats ? 'Continue' : 'Fill in your stats to continue'}
        </button>
      </div>
    )
  }

  // ================= STEP 1: TIMED GOAL =================
  if (step === 1) {
    return (
      <StepShell step={step} title="Want a timed goal?" subtitle="Optional — lose or gain a specific amount by a specific date." onBack={back} onNext={next} showSkip={!goalPlanResult}>
        <div className="card">
          {!goalPlanResult && (
            <GoalPlanner
              weightLbs={Number(weightLbs)}
              weightKg={lbsToKg(Number(weightLbs))}
              bmr={liveTargets.bmr}
              tdee={liveTargets.tdee}
              onStart={setGoalPlanResult}
              onSkip={next}
            />
          )}
          {goalPlanResult && (
            <div>
              <p className="small" style={{ marginBottom: 10 }}>
                <strong>{goalPlanResult.goalPlanCore.type === 'lose' ? 'Lose' : 'Gain'} {goalPlanResult.goalPlanCore.targetChangeLbs} lbs</strong> over {goalPlanResult.goalPlanCore.weeks} weeks —
                {' '}{goalPlanResult.preview.calories} kcal/day
              </p>
              <button className="secondary" onClick={() => setGoalPlanResult(null)}>Remove this goal</button>
            </div>
          )}
        </div>
      </StepShell>
    )
  }

  // ================= STEP 2: SAFETY =================
  if (step === 2) {
    return (
      <StepShell step={step} title="Allergies & dietary framework" subtitle="This is the most important step — these are hard excludes everywhere the app suggests food." onBack={back} onNext={next}>
        <div className="card">
          <label style={{ marginBottom: 8 }}>Any diagnosed allergies or severe intolerances?</label>
          <div className="tag-grid" style={{ marginBottom: 16 }}>
            {ALLERGEN_OPTIONS.map(a => (
              <Chip key={a.key} active={allergies.includes(a.key)} activeClass="dislike" onClick={() => setAllergies(al => al.includes(a.key) ? al.filter(x => x !== a.key) : [...al, a.key])}>
                {a.label}
              </Chip>
            ))}
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Ethical, cultural, or religious dietary framework</label>
            <select value={dietaryFramework} onChange={e => setDietaryFramework(e.target.value)}>
              {DIETARY_FRAMEWORK_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
        </div>
        {(allergies.length > 0 || dietaryFramework !== 'none') && (
          <p className="muted small">
            This is keyword-based filtering — it catches the obvious cases but isn't certified compliance (especially for halal/kosher). Always check labels for anything that truly matters.
          </p>
        )}
      </StepShell>
    )
  }

  // ================= STEP 3: EATING STYLE =================
  if (step === 3) {
    return (
      <StepShell step={step} title="Eating style" subtitle="A style you've felt best doing before, if any." onBack={back} onNext={next}>
        <div className="card">
          {Object.entries(EATING_STYLES).map(([key, v]) => (
            <div
              key={key}
              className={`tag-chip ${eatingStyle === key ? 'like' : ''}`}
              style={{ display: 'block', marginBottom: 8, borderRadius: 10, padding: '10px 14px' }}
              onClick={() => setEatingStyle(key)}
            >
              {v.label}
            </div>
          ))}
        </div>
      </StepShell>
    )
  }

  // ================= STEP 4: FOOD PREFERENCES =================
  if (step === 4) {
    return (
      <StepShell step={step} title="Foods you like &amp; avoid" subtitle="Tap once to like (green), tap again to mark as a deal-breaker (red)." onBack={back} onNext={next}>
        <div className="card">
          <IngredientCategory label="Animal proteins" items={PROTEIN_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Seafood" items={SEAFOOD_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Plant-based proteins" items={PLANT_PROTEIN_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Carbs & grains" items={CARB_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Vegetables" items={VEGGIE_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Fruits" items={FRUIT_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
          <IngredientCategory label="Dairy & alternatives" items={DAIRY_ITEMS} liked={likedIngredients} disliked={dislikedIngredients} onToggle={toggleIngredient} />
        </div>
      </StepShell>
    )
  }

  // ================= STEP 5: TEXTURE & FLAVOR =================
  if (step === 5) {
    return (
      <StepShell step={step} title="Texture &amp; flavor" onBack={back} onNext={next}>
        <div className="card">
          <label style={{ marginBottom: 8 }}>Textures you can't tolerate</label>
          <div className="tag-grid" style={{ marginBottom: 16 }}>
            {['Slimy / mushy', 'Chunky / grainy', 'Chewy / fatty'].map(t => (
              <Chip key={t} active={textureAversions.includes(t)} activeClass="dislike" onClick={() => toggleTexture(t)}>{t}</Chip>
            ))}
          </div>

          <div className="field">
            <label>Spicy heat</label>
            <select value={spiceTolerance} onChange={e => setSpiceTolerance(e.target.value)}>
              <option value="love">Love it, want it often</option>
              <option value="mild">Mild heat only</option>
              <option value="none">Zero tolerance</option>
            </select>
          </div>
          <div className="field">
            <label>Sweet & savory combos (fruit in salads, honey glazes)</label>
            <select value={sweetSavoryCombo} onChange={e => setSweetSavoryCombo(e.target.value)}>
              <option value="love">Love it</option>
              <option value="fine">Totally fine with it</option>
              <option value="hate">Keep them separate</option>
            </select>
          </div>
          <div className="field">
            <label>Bitter / pungent foods (blue cheese, arugula, vinegar)</label>
            <select value={bitterTolerance} onChange={e => setBitterTolerance(e.target.value)}>
              <option value="enjoy">Enjoy them</option>
              <option value="tolerable">Tolerable in small amounts</option>
              <option value="avoid">Avoid completely</option>
            </select>
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }}
            onClick={() => setCilantroSoap(c => !c)}
          >
            <div className={`checkbox ${cilantroSoap ? 'on' : ''}`}>{cilantroSoap ? '✓' : ''}</div>
            <span className="small">Cilantro tastes like soap to me</span>
          </div>
        </div>
      </StepShell>
    )
  }

  // ================= STEP 6: LIFESTYLE & KITCHEN =================
  if (step === 6) {
    return (
      <StepShell step={step} title="Kitchen &amp; lifestyle" onBack={back} onNext={next}>
        <div className="card">
          <div className="field">
            <label>Leftovers & meal prep</label>
            <select value={leftoverTolerance} onChange={e => setLeftoverTolerance(e.target.value)}>
              <option value="love">Love batch cooking — happy with the same meal 3-4 days</option>
              <option value="twoDay">Fine for 2 days, then I need variety</option>
              <option value="hate">Prefer fresh-cooked meals over leftovers</option>
            </select>
          </div>
          <div className="field">
            <label>Any specific foods you hate reheated? (optional)</label>
            <input value={hatesReheated} onChange={e => setHatesReheated(e.target.value)} placeholder="e.g. reheated fish" />
          </div>
          <div className="field">
            <label>Cooking complexity</label>
            <select value={cookingComplexity} onChange={e => setCookingComplexity(e.target.value)}>
              <option value="minimalist">Minimalist — under 20 min, few ingredients</option>
              <option value="moderate">Moderate — 30-45 min is fine</option>
              <option value="enthusiast">Culinary enthusiast — I enjoy cooking</option>
            </select>
          </div>
          <div className="field">
            <label>Convenience items (rotisserie chicken, steamable veggies)</label>
            <select value={convenienceLevel} onChange={e => setConvenienceLevel(e.target.value)}>
              <option value="yes">Yes please, I need the time-savers</option>
              <option value="balanced">Balance of fresh and convenience</option>
              <option value="scratch">I prefer cooking from raw, whole ingredients</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Weekday lunch preference</label>
            <select value={lunchTemperature} onChange={e => setLunchTemperature(e.target.value)}>
              <option value="hot">Must be hot, cooked/reheated</option>
              <option value="cold">Prefer cold, quick options</option>
              <option value="either">No preference</option>
            </select>
          </div>
        </div>
      </StepShell>
    )
  }

  // ================= STEP 7: BEVERAGES & NON-NEGOTIABLE =================
  if (step === 7) {
    return (
      <StepShell step={step} title="Beverages &amp; your non-negotiable" subtitle="Informational — helps give context, not used to auto-restrict anything." onBack={back} onNext={next}>
        <div className="card">
          <div className="field">
            <label>Coffee / tea (optional)</label>
            <input value={coffeeNotes} onChange={e => setCoffeeNotes(e.target.value)} placeholder="e.g. black, or with heavy cream and 2 sugars" />
          </div>
          <div className="field">
            <label>Water (optional)</label>
            <input value={waterNotes} onChange={e => setWaterNotes(e.target.value)} placeholder="e.g. mostly sparkling" />
          </div>
          <div className="field">
            <label>Soda / energy drinks (optional)</label>
            <input value={sodaNotes} onChange={e => setSodaNotes(e.target.value)} placeholder="e.g. one Diet Coke most days" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Alcohol (optional)</label>
            <input value={alcoholNotes} onChange={e => setAlcoholNotes(e.target.value)} placeholder="e.g. 2-3 beers on weekends" />
          </div>
        </div>
        <div className="card">
          <label style={{ marginBottom: 8 }}>The one thing you won't give up</label>
          <input value={nonNegotiable} onChange={e => setNonNegotiable(e.target.value)} placeholder="e.g. pizza night with my family on Fridays" />
          <p className="muted small" style={{ marginTop: 8, marginBottom: 0 }}>
            Being honest here means this can be built into your budget instead of fought against.
          </p>
        </div>
      </StepShell>
    )
  }

  // ================= STEP 8: REVIEW =================
  const finalCalories = goalPlanResult ? goalPlanResult.preview.calories : liveTargets.calories
  return (
    <div className="app-shell" style={{ paddingTop: 20 }}>
      <p className="muted small mono" style={{ marginBottom: 4 }}>Step {TOTAL_STEPS} of {TOTAL_STEPS}</p>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Ready to go</h1>

      <div className="card" style={{ borderColor: 'var(--fuel)' }}>
        <p className="odometer" style={{ fontSize: 34, color: 'var(--fuel)', marginBottom: 8 }}>{finalCalories} <span className="odometer-unit">kcal/day</span></p>
        {allergies.length > 0 && <p className="small" style={{ color: 'var(--danger)' }}>Allergies excluded: {allergies.map(k => ALLERGEN_OPTIONS.find(a => a.key === k)?.label).join(', ')}</p>}
        {dietaryFramework !== 'none' && <p className="small">Framework: {DIETARY_FRAMEWORK_OPTIONS.find(d => d.key === dietaryFramework)?.label}</p>}
        <p className="small" style={{ marginBottom: 0 }}>
          {likedIngredients.length} liked foods · {dislikedIngredients.length} avoided
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="secondary" onClick={back}>Back</button>
        <button className="primary" style={{ flex: 1 }} onClick={handleSubmit}>Start using Strong Nutes</button>
      </div>
    </div>
  )
}
