# Mazbien AI Training Needs Assessment

Next.js 14 (App Router) + Tailwind + Supabase (Auth + Postgres) + Vercel.

Flow: Home -> sign in (email; Google is commented out for now) -> tap-to-choose assessment -> pick package -> add-ons with "why this was suggested" -> review -> payment preference (nothing charged) -> sent to a consultant. Consultants review, adjust, add private notes, and approve.

## 1. Open it in Cursor
1. Unzip this folder.
2. Cursor -> **File -> Open Folder...** and choose `mazbien-assessment`. (Or in a terminal inside the folder: `cursor .`)
3. Open the terminal in Cursor (Ctrl/Cmd + `) and run:
   ```bash
   npm install
   cp .env.example .env.local     # Windows: copy .env.example .env.local
   ```
4. Fill in `.env.local` (step 3 below), then `npm run dev` and visit http://localhost:3000

Already have a GitHub repo for mazbien.vercel.app? Copy these files over it (keep your `.git` folder), commit, push, and Vercel redeploys.

## 2. Set up the database (Supabase -> SQL Editor)
Run these files in order. Paste each one into a new query and press Run.

| Order | File | What it does |
|---|---|---|
| 1 | `supabase/migrations/001_schema.sql` | Tables, foreign keys, Row Level Security |
| 2 | `supabase/seed/01_reference_data.sql` | Departments, questions + options, 4 packages, 13 add-ons |
| 3 | `supabase/seed/02_demo_data.sql` | 40 synthetic organizations with answers, recommendations, choices, notes |
| 4 | `supabase/seed/04_make_consultant.sql` | Makes your test account a consultant (after you sign up once) |

Before running #3 and #4, change `reviewer@example.com` to your test account's email.
To wipe and reload demo data: run `03_reset_demo_data.sql`, then `02_demo_data.sql` again.

## 3. Keys you need
**Supabase** -> Project Settings -> API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon / publishable key
- The service role key is NOT needed by this app. Never put it in browser code.

**Supabase Auth settings** (Authentication -> URL Configuration)
- Site URL: `https://mazbien.vercel.app`
- Redirect URLs: `http://localhost:3000/**` and `https://mazbien.vercel.app/**`
- Authentication -> Providers -> **Email** is on by default. For easy grading, turn off "Confirm email" (Authentication -> Sign In / Providers -> Email) so a new account can sign in immediately.

**Google sign-in** (COMMENTED OUT in `app/login/LoginForm.tsx` for now. Un-comment the `google()` function and the button to use it.)
1. Google Cloud Console -> new project -> APIs & Services -> **OAuth consent screen** (External).
2. Credentials -> Create Credentials -> **OAuth client ID** -> Web application.
3. Authorized redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret.
5. Supabase -> Authentication -> Providers -> **Google** -> enable, paste both.
The Google secret lives only in Supabase. It never goes in Vercel or this code.

**Vercel** -> Project -> Settings -> Environment Variables (all environments)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Redeploy after saving them.

## 4. Test account for the assignment
1. On your deployed site, click Sign in -> Create an account with a throwaway email + password (not one you use anywhere else).
2. Put those in your Word/PDF submission.
3. Run `04_make_consultant.sql` with that email so the grader can see the consultant dashboard full of data. The same account also has its own 3 seeded assessments under "My assessments".
4. Test a normal client too: sign up a second account and confirm it sees only its own records and gets "Consultants only" on /consultant.

## 5. Where things live
- `app/` pages: home, about, programs, shop, contact, login, `assessment` (wizard + plan flow), `dashboard` (client), `consultant`
- `lib/recommend.ts` the simple rules that create add-on suggestions with reasons
- `lib/photos.ts` placeholder Unsplash photos (swap for Mazbien's real ones)
- `lib/links.ts` LinkedIn / Instagram / Facebook links. **Facebook is a placeholder.**
- `supabase/` all SQL
- `docs/` draft text for the written parts of Assignment 3

## 6. Known limits (be honest about these in your write-up)
- Prices and package contents are placeholders (Uzoma said you may invent them).
- Payment is a preference only. No Stripe.
- "Save and continue later" saves in this browser (localStorage) until the assessment is submitted.
- Follow-up questions use simple rules (`condition_json`), not an AI model.
- Shop page and cart icon are sample content, not a working store.
- Unsplash photo URLs could not be tested from the build machine. If one is broken, the card shows a colour gradient. Replace them in `lib/photos.ts`.
