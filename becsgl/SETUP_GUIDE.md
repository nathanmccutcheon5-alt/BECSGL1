# BECSGL App — Setup Guide
No coding experience required. Follow these steps in order.
Estimated time: 60–90 minutes.

---

## What you'll set up
1. **Supabase** — the database that stores all scores and team info
2. **Vercel** — free hosting that puts the app on the internet
3. **Twilio** — sends SMS reminders to teams
4. **GitHub** — stores your code (Vercel reads from it automatically)

---

## STEP 1 — Get the code onto GitHub

1. Go to https://github.com and create a free account if you don't have one
2. Click the **+** button (top right) → **New repository**
3. Name it `becsgl`, set it to **Private**, click **Create repository**
4. On your computer, download and install **GitHub Desktop**: https://desktop.github.com
5. Open GitHub Desktop → **File → Add Local Repository**
6. Navigate to the folder containing this code and select it
7. Click **Publish repository** → choose your GitHub account → **Publish**

---

## STEP 2 — Set up Supabase (the database)

1. Go to https://supabase.com and sign up for a free account
2. Click **New project** → give it a name like `becsgl` → choose a region close to Arizona → set a database password (save this somewhere!) → **Create new project**
3. Wait ~2 minutes for it to set up

**Run the database setup script:**
4. In your Supabase project, click **SQL Editor** in the left sidebar
5. Click **New query**
6. Open the file `supabase/migrations/001_initial.sql` from this project in any text editor (Notepad is fine)
7. Select all the text (Ctrl+A), copy it, paste it into the Supabase SQL editor
8. Click **Run** (green button). You should see "Success" messages.

**Get your API keys:**
9. In Supabase, go to **Settings** (gear icon) → **API**
10. Copy and save these three values — you'll need them in Step 4:
    - **Project URL** (looks like `https://abcxyz.supabase.co`)
    - **anon/public key** (long string under "Project API keys")
    - **service_role key** (click "Reveal" — keep this secret!)

---

## STEP 3 — Set up Twilio (SMS)

1. Go to https://www.twilio.com and sign up for a free trial account
2. Verify your phone number during signup
3. On the Twilio dashboard, you'll see your **Account SID** and **Auth Token** — save both
4. Click **Get a trial phone number** → confirm → save the number (format: +1xxxxxxxxxx)

> Twilio trial gives you ~$15 credit, enough to send several hundred texts.
> When you're ready to go live, you'll add a payment method (~$1–2/month for the league).

---

## STEP 4 — Generate your commissioner password hash

1. Make sure you have **Node.js** installed: https://nodejs.org (download the LTS version)
2. Open **Terminal** (Mac) or **Command Prompt** (Windows)
3. Navigate to your project folder:
   ```
   cd path/to/becsgl
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Generate your password hash (replace `yourpassword` with what you want):
   ```
   node scripts/hash-password.js yourpassword
   ```
6. It will print something like:
   ```
   COMMISSIONER_PASSWORD_HASH=$2b$12$...long string...
   ```
   Copy the whole line including the `$2b$12$...` part.

---

## STEP 5 — Create your environment file

1. In the project folder, find the file called `.env.local.example`
2. Make a copy of it and rename the copy to `.env.local`
3. Open `.env.local` in a text editor and fill in each value:

```
NEXT_PUBLIC_SUPABASE_URL=           ← paste your Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=      ← paste your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=          ← paste your Supabase service_role key

COMMISSIONER_EMAIL=                 ← your email address
COMMISSIONER_PASSWORD_HASH=         ← paste the hash from Step 4

COMMISSIONER_JWT_SECRET=            ← type any long random string (30+ characters)

TWILIO_ACCOUNT_SID=                 ← from Twilio dashboard
TWILIO_AUTH_TOKEN=                  ← from Twilio dashboard
TWILIO_PHONE_NUMBER=                ← your Twilio number, format +1xxxxxxxxxx

NEXT_PUBLIC_APP_URL=                ← leave blank for now, fill in after Step 6
```

4. Save the file. **Never share or commit this file — it contains secrets.**

---

## STEP 6 — Deploy to Vercel

1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New → Project**
3. Find your `becsgl` repository and click **Import**
4. Under **Environment Variables**, add each variable from your `.env.local` file:
   - Click **Add** for each one, paste the name and value
   - Do this for all variables except `NEXT_PUBLIC_APP_URL` (skip for now)
5. Click **Deploy** and wait ~2 minutes
6. Vercel will give you a URL like `https://becsgl-abc123.vercel.app`
7. Copy that URL, go back to **Settings → Environment Variables**, and add:
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: your Vercel URL (no trailing slash)
8. Go to **Deployments → Redeploy** so the app picks up the new variable

---

## STEP 7 — Get team links and text them out

1. Go to `https://your-app.vercel.app/commissioner`
2. Log in with your email and the password you used in Step 4
3. Click the **Teams** tab
4. Each team has a **Copy link** button — click it to copy their unique URL
5. Text each team captain their link. Something like:
   > "Hey! Use this link all season to enter your BECSGL scores: [link]. Bookmark it — that's your team's page."

---

## STEP 8 — Send your first weekly reminders

Each week, log into the commissioner dashboard and go to **Notify**:
- Select the current week
- Click **Send week X reminders** — this texts both players on every team with their matchup and score link
- If any teams have unplayed makeup matches, click **Send makeup reminders**

---

## How the scoring flow works

1. Each team taps their link, selects the current week
2. **Team A** enters their own 9 hole scores + opponent's 9 hole scores
3. **Team B** does the same independently
4. When both teams submit, the app automatically:
   - Calculates hole-by-hole points (2 for win, 1 each for tie, 0 for loss)
   - Adds the +2 match bonus to the winner
   - Locks the match and updates the leaderboard
   - Texts both teams the final result
5. If scores don't match, neither team can submit — they work it out and re-enter

---

## Commissioner overrides

- Go to `/commissioner` → **Matches** tab
- Select any week, click **Edit** on any match to enter or fix scores manually
- Click **Unlock** on a locked match to reopen it for editing
- The **Save & lock** button recalculates points and locks it

---

## Troubleshooting

**"Invalid token" when entering scores:** The team link is wrong or the database wasn't seeded correctly. Re-run Step 2 and check that the teams table has data.

**SMS not sending:** Double-check your Twilio credentials in Vercel's environment variables. Make sure the phone number format is +1xxxxxxxxxx (no dashes or spaces).

**Can't log into commissioner:** Re-run the password hash script in Step 4 and make sure you updated the environment variable in Vercel and redeployed.

**Scores not showing up on standings:** Check the Supabase dashboard → Table Editor → matches table to see if records are being created.

---

## Support

If you get stuck, the error message is your friend — copy it and search it.
For Supabase questions: https://supabase.com/docs
For Vercel questions: https://vercel.com/docs
For Twilio questions: https://help.twilio.com
