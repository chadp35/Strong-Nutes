# Fuel — Meal & Macro Tracker

A multi-user React app that calculates BMR/TDEE and daily macro targets, generates
a meal plan around your food preferences, matches meals to what's already in your
kitchen, and builds a shopping list — with real accounts and data that persists
across devices.

## What's in this version
- **Real accounts** — email/password sign-up and sign-in via Supabase Auth. Each person's data is private to them.
- **Perpetual memory** — profile, log, meal plan, and pantry are stored in a Postgres database (Supabase), not the browser. Sign in from any device and it's all there.
- **Today tab** — BMR-based targets, running daily log, one-tap logging of today's planned meals.
- **Plan tab** — generates a 7-day meal plan weighted toward what you like. Each meal shows ingredients, a recipe, and a **servings-to-prep** control that scales the ingredient list and tells you the approximate weight per portion (and total batch weight) so you can measure it out on a food scale.
- **Pantry tab** — type in what you've got on hand (comma or line separated), optionally filter by meal type, and it ranks meals by how many ingredients you already have, tells you what's missing, and lets you scale + log directly from there.
- **Shop tab** — shopping list aggregated and totaled (not just repeated) from the week's plan.

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
instant and needs no API key. If you want it to get smarter later — e.g. handling
"chicken" matching "chicken thighs," or generating a brand-new recipe from odd
leftovers instead of only matching the existing database — that's a good next
step, but it means calling an LLM from a server-side function (so your Anthropic
API key isn't exposed in the browser). A Vercel Edge Function or Supabase Edge
Function calling the Claude API would be the natural place for that.

## Continuing development
Good next things to ask Claude Code for:
- Smarter pantry matching (fuzzy/partial ingredient matching, or LLM-backed via a serverless function as above)
- A bigger food database (`src/data/foods.js` — follow the existing shape: calories/macros/ingredients are per serving, `servingWeightG` is the approximate plated weight)
- Weekly trends (weight over time, adherence to targets) — would need a new table, e.g. `weight_logs`
- "Swap this meal" on the plan screen instead of full regenerate
- Magic-link or OAuth (Google/Apple) sign-in — Supabase supports both with minor config changes to `AuthScreen.jsx`
- Password reset flow (`supabase.auth.resetPasswordForEmail`)

## Project structure
```
supabase/
  schema.sql          run once in the Supabase SQL editor
.env.example           copy to .env with your Supabase project's values
src/
  lib/
    supabaseClient.js  Supabase client init
    calculations.js    BMR/TDEE/macro target math (Mifflin-St Jeor)
    mealPlanner.js      plan generation, shopping list, serving scaling, pantry matching
    storage.js          load/save the signed-in user's state to Supabase
  data/
    foods.js            meal database (macros, tags, structured ingredients, serving weight, recipe)
  components/
    AuthScreen.jsx       sign in / sign up
    Onboarding.jsx
    Dashboard.jsx
    MealPlanTab.jsx
    PantryTab.jsx
    ShoppingListTab.jsx
    SettingsTab.jsx
    Gauge.jsx
  App.jsx                auth + data sync + tab routing
```
