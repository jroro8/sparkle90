# ✨ Sparkle Sprint

A rainbow, sparkly habit tracker for the last three months of the year (October 1 – December 31, 2026).

- **Today**: tap each habit to check it off. The big ring shows today's percentage, the smaller ring shows your overall percentage, and a perfect day gets confetti.
- **Calendar**: all 92 days with each day's percentage. 🌈 marks a perfect day. Tap any past day to fix something you forgot.
- **Stats**: overall percentage, perfect-day count, and each habit's percentage, current streak and best streak.
- **Settings**: rename, reorder, recolor, add or remove habits; set your name; back up or restore; manage cloud sync.

**How the percentages work**
- *Daily* = habits checked that day ÷ habits on your list that day.
- *Overall* = every check-in so far ÷ every check-in possible from Oct 1 through today.
- A habit you add later only counts from the day you add it. A habit you remove keeps its past check-ins, so earlier percentages don't change.

## Set up (same as Wild Quest)

1. **GitHub**: create a new empty repo and upload everything in this folder. Drag the `src`, `api` and `public` **folders** in too; the file picker skips folders. Don't upload the zip.
2. **Vercel**: go to **Add New… → Project** and import the repo. Before deploying, open **Environment Variables** and add `APP_PASSCODE` = your passcode. Then click Deploy **once**. Don't refresh that page, because each refresh creates another project.
3. **Database**: in the project, go to **Storage → Create Database → Neon** (free plan) and connect it.
4. Go to **Deployments → ⋯ → Redeploy**.
5. Open the site and enter your passcode. Add it to your phone's home screen so it opens like an app: in Safari use Share → Add to Home Screen; in Chrome use ⋮ → Add to Home screen.

This is a separate Vercel project with its own database and passcode, so it's completely separate from Wild Quest.

## Files
- `src/App.jsx`: the screens
- `src/data.js`: your habits, dates and percentage math
- `src/sync.js`: cloud save (same as Wild Quest)
- `api/state.js`: the Vercel function that stores your data in Postgres
