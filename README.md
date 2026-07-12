# Strong Nutes — Meal & Macro Tracker

A multi-user React app that calculates BMR/TDEE and daily macro targets, generates
a meal plan around your food preferences, matches meals to what's already in your
kitchen, and builds a shopping list — with real accounts and data that persists
across devices.

## What's in this version
- **Real accounts** — email/password sign-up and sign-in via Supabase Auth. Each person's data is private to them.
- **Perpetual memory** — profile, log, meal plan, and pantry are stored in a Postgres database (Supabase), not the browser. Sign in from any device and it's all there.
- **Today tab** — BMR-based targets, running daily log, one-tap logging of today's planned meals, a water tracker, and an Add Food panel with three ways to log: branded food search (real products via Open Food Facts), My Foods (anything you've saved before), and manual entry.
- **Plan tab** — generates a 7-day meal plan scaled to actually hit your calorie target, with per-meal editing: regenerate just one meal, or swap in a pantry match for that specific slot. Each meal shows a servings-to-prep control with approximate portion weight for measuring on a food scale.
- **Pantry tab** — type in what you've got on hand, ranks meals by ingredient overlap, tells you what's missing.
- **Progress tab** — optional body composition tracking: weight plus any measurements someone wants (waist, quads, calves, bust, hips). Prompts for a check-in roughly once a week without being pushy about it, shows a weight trend chart, exports the full history as CSV, and shows any comments/reactions from a coach if the person has one assigned.
- **Timed goal plans** — in Onboarding (optional) or anytime in Settings: say how many lbs to lose or gain, and it suggests three timeframes ranked easiest-to-hardest, flags aggressive paces, and builds in a flexible calorie range. Starting, changing, or stopping a plan immediately updates targets and regenerates the meal plan to match.
- **On the Go** (inside the Pantry tab) — pick a specific chain (7-Eleven, RaceTrac, Dollar General, Wawa, AAFES Shoppette, Publix, Chick-fil-A, and about 20 others) and get realistic grab-and-go options ranked against what's left in your day. This is a curated reference database at the chain level, **not live inventory for one specific location** — no free API exists for that, and stock still varies store to store. Always double-check the label.
- **Coach-client system** — clients can optionally choose a coach in Settings. The assigned coach gets a dashboard showing each client's targets, recent 7-day logging adherence, and body-comp check-in history, with the ability to leave comments and 💪 reactions on specific check-ins — the client sees and can reply to those on their own Progress tab. Chad Penson (`chadp35@gmail.com`) is the only coach for now; see the one-time SQL step below for how that's set up, and how to add more coaches later.
- **Shop tab** — shopping list aggregated and totaled from the week's plan.

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

## How the calorie-target scaling works
Each day's meals get picked first for preference fit, then scaled together by
one multiplier (clamped between 0.75× and 1.6×) so the day actually lands on
your calorie target, with an extra snack added if clamping alone can't close
the gap. Regenerating or swapping a single meal rescales that whole day again
the same way, so the day total stays accurate no matter how you edit it.

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
- Real store inventory instead of the curated On the Go list — Kroger has a free developer API with product search; Walmart's requires approval. Either needs a small backend/serverless function to keep the API key off the client, similar to the AI-powered pantry note above.
- Smarter pantry matching (fuzzy/partial ingredient matching, or LLM-backed via a serverless function so an Anthropic API key isn't exposed in the browser)
- A bigger food database (`src/data/foods.js` — follow the existing shape: calories/macros/ingredients are per serving, `servingWeightG` is the approximate plated weight)
- Coach-side improvements: a way for a coach to see aggregate stats across all clients at a glance, or push a suggested calorie adjustment directly from the dashboard
- Auto-adjusting goal plans based on actual logged weight trend vs. the plan's projection (the 3500-kcal math is a starting estimate, not a guarantee — real progress should be able to nudge it)
- Barcode scanning for the branded food search (Open Food Facts supports barcode lookup, not just text search)
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
    calculations.js    BMR/TDEE/macro target math (Mifflin-St Jeor)
    mealPlanner.js      plan generation, shopping list, serving scaling, pantry matching, per-slot regenerate/swap
    storage.js          load/save the signed-in user's state to Supabase
    openFoodFacts.js    branded food search (Open Food Facts API)
  data/
    foods.js            meal database (macros, tags, structured ingredients, serving weight, recipe)
  components/
    AuthScreen.jsx       sign in / sign up
    Onboarding.jsx
    Dashboard.jsx
    AddFoodPanel.jsx     branded search / My Foods / manual entry
    MealPlanTab.jsx
    PantryTab.jsx
    ShoppingListTab.jsx
    SettingsTab.jsx
    Gauge.jsx
  App.jsx                auth + data sync + tab routing
```
