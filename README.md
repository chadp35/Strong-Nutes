# Strong Nutes — Meal & Macro Tracker

A multi-user React app that calculates BMR/TDEE and daily macro targets, generates
a meal plan around your food preferences, matches meals to what's already in your
kitchen, and builds a shopping list — with real accounts and data that persists
across devices.

## What's in this version
- **Real accounts** — email/password sign-up and sign-in via Supabase Auth. Each person's data is private to them.
- **Perpetual memory** — profile, log, meal plan, and pantry are stored in a Postgres database (Supabase), not the browser. Sign in from any device and it's all there.
- **Today tab** — BMR-based targets, running daily log, one-tap logging of today's planned meals, a water tracker, and an Add Food panel with four ways to log: branded food search, **barcode scanning**, My Foods, and manual entry.
- **Plan tab** — generates a 7-day meal plan scaled to actually hit your calorie target using real, whole meals — extra calories come from an additional whole meal or grazing-sized sides, never a resized recipe. Per-meal editing (regenerate, pantry-swap), plus **bulk-prep controls** on every meal: scale ingredients for a real batch, then weigh what you actually cooked to get an exact per-portion gram target — accounts for water loss/gain during cooking, which a fixed estimate can't. Wrap-style meals (burritos, quesadillas, fajitas) split the tortilla out from the bulk-cooked filling automatically.
- **Pantry tab** — three modes: "My Pantry" matches meals to what you have; "On the Go" gives chain-level grab-and-go picks (21 chains — 7-Eleven, RaceTrac, Dollar General, AAFES Shoppette, Publix, and more) ranked against your remaining macros; **"My Recipe"** lets you build a custom recipe from real ingredients and get calculated nutrition — see below.
- **9-step onboarding wizard** — based on a full dietitian-style intake questionnaire: stats, optional timed goal, allergies & dietary framework (hard excludes, not just preferences), eating style, detailed food preferences by category, texture/flavor profile, kitchen & lifestyle habits, beverages & your "non-negotiable," then review. Every step past the first is skippable — thoroughness is available, not forced.
- **Progress tab** — optional body composition tracking with a weekly check-in prompt, weight trend chart, CSV export, and coach comments/reactions if you have a coach assigned.
- **Timed goal plans** — lose/gain N lbs in N weeks, three ranked timeframes, automatic macro + meal plan updates.
- **Coach-client system** — clients pick a coach in Settings; the coach gets a read-only dashboard of each client's targets, adherence, and check-in history, with comments and 💪 reactions. Chad Penson (`chadp35@gmail.com`) is the only coach for now — see the one-time SQL step below.
- **Shop tab** — shopping list aggregated and totaled from the week's plan.
- **Resilient to flaky connectivity** — see "Internet failover" below.

## Internet failover — what's actually covered
This is a resilience layer, not a full offline-first app (that would mean the
app itself loading with zero connectivity from a cold start, which needs a
service worker precaching the app shell — a bigger, separate project). What's
built now handles the much more common case: **you're using the app and the
connection drops or hiccups.**
- **Reading your data**: if Supabase can't be reached, the app falls back to
  the last successfully loaded copy (cached in `localStorage`) instead of
  showing a blank/reset app. A banner says so explicitly.
- **Saving your data**: every save retries a couple of times automatically. If
  it still fails, the edit gets queued locally instead of silently lost, and
  syncs automatically the moment the browser reports it's back online — no
  need to reopen the app or do anything.
- **Search and barcode lookups** (Open Food Facts): a 10-second timeout so a
  dead connection fails fast with a clear message instead of hanging
  indefinitely, plus an upfront offline check.
- **Sign-in**: a plain "you're offline" message instead of a raw network
  error if you try to sign in with no connection.

## Barcode scanning
Uses `@zxing/browser` (camera-based, works on iOS and Android browsers) plus
Open Food Facts' barcode lookup endpoint. Available from a dedicated "📷 Scan
barcode" button — not tucked behind a search flow — in three places: food
logging (Today tab), "+ Add a meal or side" (Plan tab), and ingredient search
inside the recipe builder (Pantry tab). If the camera can't be accessed
(permission denied, no camera, unsupported browser), it falls back to typing
the barcode number by hand instead of being a dead end.

**No longer lazy-loaded.** It was originally split into its own chunk to keep
the initial bundle small, but that introduced a multi-second "is this
broken?" delay the first time someone tapped Scan in a session — real,
direct feedback that the delay wasn't worth the bundle-size savings. It's
back in the main bundle now, so tapping Scan is instant. The honest tradeoff:
initial page load is a bit heavier (~250KB gzipped) in exchange for the
in-app experience never feeling like it's hanging.

**One honest caveat**: the exact library API was verified against its shipped
TypeScript definitions before writing this, so the code matches what the
library actually exposes — but a live camera stream can't be tested from this
sandboxed environment. Worth a real test on your phone as the first thing to
check after deploying.

## Faster, bigger local food database
Two things work together to cut down how often you need the (slower) web
search or barcode path at all:
- **`src/data/commonBrands.js`** — ~50 everyday branded products (Great
  Value's store brand covers most grocery categories, plus a handful of other
  near-universal staples like Chobani, Jif, Barilla) searchable instantly,
  with zero network call.
- **Your own "discovered products" cache** — every time a barcode scan or web
  search result actually gets used (added to a log, a recipe, or a plan day),
  it's saved to your personal product list (`discoveredProducts`, synced via
  Supabase). Scan something once, and it's an instant local match every time
  after that — the database genuinely grows the more you use it.

Local results always show first and instantly as you type; web search is a
deliberate button press rather than something that auto-fires on every
keystroke, so the network is only ever in the critical path when you actually
need it.

## Recipes: editable, and flexible in the Plan tab
- **Editing** — every saved recipe keeps its full builder state (ingredients,
  drained-fat amount, weighed total, servings) attached, so reopening it for
  editing rehydrates exactly what you had, not just the final numbers. Edit
  from the Pantry tab's "My Recipe" mode (recipe list at the top) or from
  Settings.
- **Gram-flexible in the Plan tab** — "+ Add a meal or side" has a "My
  Recipes" tab: pick a recipe, see its recommended serving size in grams, and
  adjust it up or down directly — macros and the shopping-list ingredients
  scale together with it. This is the RP Strength-style flexibility that was
  missing: not just "add 1 serving," but "add exactly how much I'm actually
  eating."

*No Supabase schema changes for this update* — internet failover, barcode
scanning, and bulk-prep are all client-side. If you're already on the
coach-system update, you can skip straight to redeploying the code below.

## ⚠️ One-time Supabase update if you set this up before the July 2026 update
This version adds `contact_email` to `app_state`, plus three new tables:
`coaches`, `coach_comments`, `coach_reactions`. Open **SQL Editor** and re-run
`supabase/schema.sql` — it's written to be safe to run again, it won't touch
existing data.

**Also required, one-time, coach setup:** after `chadp35@gmail.com` has signed
up for an account, run this in the SQL editor to mark him as a coach (also at
the bottom of `schema.sql`):
```sql
insert into coaches (user_id, display_name)
select id, 'Coach Penson' from auth.users where email = 'chadp35@gmail.com'
on conflict (user_id) do update set display_name = excluded.display_name;
```
To add another coach later, run the same query with a different email and name.

**This update specifically** adds one more column, `custom_recipes`, for the
new recipe builder. Same deal — re-run `supabase/schema.sql`, safe on existing
data. The many new profile fields (allergies, dietary framework, food
preferences, lifestyle answers, etc.) don't need a schema change at all —
`profile` is already a flexible jsonb column, so new fields just start
appearing in it the moment someone fills out the new onboarding steps.

**Latest update** adds `discovered_products` (the personal product cache) —
same deal, re-run `supabase/schema.sql` once more, safe on existing data.

## Custom recipes & the ingredient nutrition engine
The Pantry tab's "My Recipe" mode lets you build a recipe from real
ingredients (`src/data/ingredients.js`, ~90 common foods with per-100g
nutrition and realistic unit conversions — cups, tbsp, oz, "1 medium," etc.)
and get calculated nutrition facts, with two things most calculators skip:

- **A cooking-loss model that's actually correct.** Cooking heat doesn't
  destroy calories from protein, carbs, or fat — those macros are chemically
  stable at cooking temperatures. What changes nutrition is material that's
  physically removed, like fat drained after browning ground beef. So instead
  of a made-up "% lost to cooking," there's an explicit "how much fat did you
  drain" input that does real, defensible math (1 tbsp ≈ 13.5g fat ≈ 120 kcal
  removed) — and everywhere else, it tells you plainly that macros don't
  change from heat alone.
- **Real-weight portioning**, same idea as the bulk-prep feature: raw
  ingredient weight isn't what a simmered or braised dish weighs once
  finished (water evaporates or gets absorbed). Weighing the actual cooked
  result gives an accurate "grams per container" instead of guessing from
  raw ingredients.
- **Wrapper-aware bulk cooking** — mark an ingredient (a tortilla, a bun) as
  a wrapper, and the recipe correctly separates "bulk-cook this filling" from
  "grab this fresh at serving time," the same distinction `foods.js` already
  uses for burritos, wraps, and quesadillas.

If an ingredient isn't in the local database, there's a "search the web"
fallback straight to Open Food Facts, same as branded food search. Once
saved, a custom recipe is shaped identically to a built-in meal — it flows
into meal plan generation, pantry matching, the shopping list, and bulk-prep
controls automatically, with no separate integration needed anywhere.

## Allergy & dietary-framework safety
`src/data/allergens.js` is keyword-based detection, not certified compliance
— worth being precise about. It reliably excludes the obvious cases (an
ingredient literally named "shrimp" trips the shellfish filter) from
**every** automatic suggestion path: meal plan generation, pantry matching,
sides, On the Go, and the extra-meal picker. It cannot verify
cross-contamination, hidden derivatives, or (for halal/kosher specifically)
actual certification or kosher meat/dairy separation — it excludes pork and
non-fish seafood for those two, which are the most universal disqualifiers,
and says so plainly in the UI. These filters only ever apply to what the
*algorithm* suggests — manually logging or searching for something is never
blocked, since that's a deliberate choice, not a suggestion.

## Architecture
This is a static frontend (Vite + React) talking directly to [Supabase](https://supabase.com)
for auth and data — there's no custom backend server to run or deploy. That's what
makes "host it on GitHub" realistic: GitHub (or Vercel/Netlify pulling from GitHub)
serves the static files, and Supabase handles accounts + the database for free at
this scale.

```
Browser (React) ──▶ Supabase Auth (sign in/up, sessions)
                 └─▶ Supabase Postgres (your data, protected by Row Level Security)
```

## One-time setup: Supabase (your database + auth)
1. Go to [supabase.com](https://supabase.com), sign up, and create a new project (pick any name/region, save the database password it generates).
2. Once the project is ready, open **SQL Editor > New query**, paste in the contents of `supabase/schema.sql` from this repo, and run it. This creates the `app_state` table and locks it down with Row Level Security so each user can only ever see their own row.
3. Go to **Project Settings > API**. Copy the **Project URL** and the **anon public** key.
4. In this project, copy `.env.example` to `.env` and paste those two values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. (Optional but recommended) In **Authentication > Settings**, you can turn off "Confirm email" if you want people to be able to sign up and use the app immediately without clicking an email link — handy while you're the only user testing it.

The anon key is meant to be public/client-side — it's not a secret. Row Level
Security (set up by the SQL script) is what actually enforces that a signed-in
user can only read or write their own data, not anyone else's.

## Run it locally
```
npm install
npm run dev
```
Open the URL it prints (usually http://localhost:5173), sign up with any email, and go.

## Hosting it on GitHub
1. Push this folder to a new GitHub repo (`git init`, `git add .`, `git commit`, create the repo on GitHub, `git push`). `.env` is git-ignored on purpose — never commit it.
2. **Easiest path — Vercel connected to GitHub** (recommended): go to [vercel.com](https://vercel.com), "Import Project," pick your GitHub repo. Vercel auto-detects Vite. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in the Vercel project settings (same values as your `.env`). Deploy — every push to `main` auto-redeploys. You get a public URL immediately, and can add a custom domain later.
3. **Alternative — GitHub Pages**: run `npm run build`, then deploy the `dist/` folder using a GitHub Action (e.g. `actions/deploy-pages`) or the `gh-pages` npm package. You'll need to set the two `VITE_SUPABASE_*` values as **repository secrets** and reference them in the build step of your workflow, since GitHub Pages has no server-side env config — they get baked into the static build at build time.

Either way, once it's deployed, anyone with the URL can sign up and get their own account and data.

## How the pantry matcher works
It's rule-based, not AI-generated: it normalizes what you typed and checks each
meal's ingredient list for overlap, then ranks by percentage matched. It's
instant and needs no API key.

## How the calorie-target math works
Breakfast/lunch/dinner are always picked and served at one real, whole
serving — never resized into fractional ingredients (nobody's measuring 1.55
tortillas). If there's a meaningful gap left to the calorie target:
- A gap of 350+ kcal gets filled with another real, whole meal (up to 2 per day).
- Whatever's left after that (usually under 350 kcal) gets filled with actual
  grazing-sized sides — fruit, nuts, yogurt, milk, a protein shake — pulled
  from `src/data/sides.js`, one whole item at a time, never a fraction of one.
- If the local sides list doesn't have a great fit, "+ Add a meal or side" on
  the Plan tab has a "Search the web" tab that queries Open Food Facts for a
  real product to add instead.

Regenerating or swapping a core meal rebuilds the day from scratch against the
new base, so the extras/sides always stay accurate to whatever's actually
there. Removing an extra meal or side doesn't auto-refill — add something back
manually if you want to close the gap again.

Deliberately not automatic: plan *generation* itself never depends on a live
web request, so it stays fast and never fails because of a network hiccup —
the web search is there as a manual option when you want it, not a dependency
the automatic plan relies on.

## How timed goal plans work
Uses the standard ~3500 kcal ≈ 1 lb approximation (a simplification — actual
metabolic adaptation varies by person — but it's the same starting point tools
like RP Strength are built on). The three suggested timeframes are based on
%-of-bodyweight change per week, a standard way trainers reason about
sustainable pace; loss can safely run faster than gain since lean muscle gain
is capped by how fast the body can actually build it. The "flexible range" is
just ±10–25% of the daily deficit/surplus — since weekly average matters far
more than hitting one exact number every day.

## Continuing development
Good next things to ask Claude Code for:
- A bigger ingredient database (`src/data/ingredients.js` — same pattern, per-100g raw nutrition + unit conversions) or a real USDA FoodData Central integration for exhaustive coverage
- Fuzzy/synonym-aware allergen and dietary-framework matching (right now "shrimp" won't match a misspelled "shrimps" or a translated ingredient name)
- A way to edit the softer preference fields (eating style, lifestyle answers) individually in Settings instead of only via "Redo full setup" — right now only allergies/dietary framework got a dedicated quick-edit
- Real store inventory instead of the curated On the Go list — Kroger has a free developer API with product search; Walmart's requires approval. Either needs a small backend/serverless function to keep the API key off the client.
- Smarter pantry matching (fuzzy/partial ingredient matching, or LLM-backed via a serverless function so an Anthropic API key isn't exposed in the browser)
- Coach-side improvements: a way for a coach to see aggregate stats across all clients at a glance, or push a suggested calorie adjustment directly from the dashboard
- Auto-adjusting goal plans based on actual logged weight trend vs. the plan's projection (the 3500-kcal math is a starting estimate, not a guarantee — real progress should be able to nudge it)
- True offline-first support (service worker precaching the app shell via `vite-plugin-pwa`) if cold-start-with-zero-connectivity ever becomes a real need — what's here now handles mid-session connectivity drops, not a fully offline cold load
- Magic-link or OAuth (Google/Apple) sign-in — Supabase supports both with minor config changes to `AuthScreen.jsx`
- Password reset flow (`supabase.auth.resetPasswordForEmail`)

## App icon / Add to Home Screen
`public/` holds the icon set (512, 192, maskable variants for Android, and an
apple-touch-icon for iOS) plus `manifest.webmanifest`. Once deployed, visiting
the site on a phone and choosing "Add to Home Screen" (iOS Safari) or the
install prompt (Android Chrome) will use this icon and open full-screen like a
native app, no browser chrome.

To change the design later: edit `scripts/generate-icon.js` (it draws a simple
SVG and rasterizes it with `sharp`), then run `node scripts/generate-icon.js`
to regenerate every size in `public/`.

## Project structure
```
supabase/
  schema.sql          run once in the Supabase SQL editor
scripts/
  generate-icon.js    regenerates the app icon set in public/
public/
  manifest.webmanifest, icon-*.png, apple-touch-icon.png, favicon-*.png
.env.example           copy to .env with your Supabase project's values
src/
  lib/
    supabaseClient.js  Supabase client init
    calculations.js    BMR/TDEE/macro target math, timed goal-plan math, eating-style macro splits
    mealPlanner.js      plan generation (real meals + sides, no scaling), shopping list, pantry matching, per-slot regenerate/swap, gram-based recipe scaling — all safety-filtered via personSettings
    recipeBuilder.js      unit conversion, ingredient nutrition totaling, cooking-loss math, serving suggestions
    localProductSearch.js  instant local search combining commonBrands + a user's discovered-products cache
    storage.js          load/save with retry + local-cache/pending-save failover
    localCache.js         localStorage read-cache and pending-save queue
    useOnlineStatus.js     online/offline detection hook
    openFoodFacts.js    branded food search + barcode lookup (Open Food Facts API), timeout-protected
    exportData.js        CSV/JSON export helpers
    coaching.js           coach-client data layer (Supabase queries)
  data/
    foods.js            core meal database (breakfast/lunch/dinner/snack; tortilla ingredients flagged isWrapper for bulk-prep)
    sides.js             small grazing-style gap-filler items
    storeSnacks.js        On the Go chain-level reference database
    ingredients.js         raw ingredient nutrition database for the recipe builder (~90 foods)
    commonBrands.js         everyday branded products (Great Value + other staples) for instant search
    allergens.js            allergen/dietary-framework keyword detection — the hard-exclusion safety layer
  components/
    AuthScreen.jsx       sign in / sign up
    Onboarding.jsx         9-step wizard (stats → goal → safety → style → food prefs → texture → lifestyle → beverages → review)
    GoalPlanner.jsx       timed goal-plan picker (used in Onboarding + Settings)
    Dashboard.jsx
    AddFoodPanel.jsx     branded search / barcode / My Foods (+ My Recipes) / manual entry
    MealPlanTab.jsx
    AddExtraPanel.jsx     add a meal/side to a day — Suggested / My Recipes (gram-adjustable) / Search (local-first + barcode)
    BulkPrepControls.jsx   batch-scale ingredients + real-weight portioning, wrapper-aware
    BarcodeScanner.jsx     camera scan with manual-entry fallback (bundled directly, not lazy — see Barcode scanning above)
    RecipeBuilder.jsx      custom recipe nutrition calculator, edit-aware (lazy-loaded — a bigger, less-frequent surface than scanning)
    PantryTab.jsx          My Pantry + On the Go + My Recipe modes (recipe list with edit/delete, cross-tab edit from Settings)
    ProgressTab.jsx        body composition tracking
    ShoppingListTab.jsx
    SettingsTab.jsx        safety-profile quick-edit (allergies/dietary framework), recipe management with edit
    CoachDashboard.jsx     coach-facing client list, surfacing allergies/diet/non-negotiable
    Gauge.jsx
  App.jsx                auth + data sync + tab routing + personSettings assembly + discovered-product recording
```
