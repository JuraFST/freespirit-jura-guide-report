---
name: update-guide-notes
description: Add or edit a guide's note in this report (e.g. explaining why someone shows as "Inactive in 2026"). Use when Jura asks to update a guide's note, add an explanation for an inactive guide, or edit data-guide-notes.js.
---

# Update a guide note

This report's tour data (`data-2025.js`, `data-2026.js`, `last-update.js`,
`dist/app.js`) is pushed here automatically from Dodai's side — don't edit
those files, they'll be overwritten on the next sync and any local change
would just be lost.

`data-guide-notes.js` is the one file that's yours to maintain. It's plain
text, no build step, no external tools required.

## Steps

1. Open `data-guide-notes.js`. It looks like:

   ```js
   const guideNotes = {
     "Full Guide Name": "Left the company in June 2026.",
   };
   ```

2. Add or edit an entry. The key must match the guide's name **exactly** as
   it appears in the report (open the live site and copy the name from the
   Guides tab if unsure — small spelling differences mean the note won't show
   up next to that guide).

3. Save the file, then commit and push:

   ```bash
   git add data-guide-notes.js
   git commit -m "Update guide note: <name>"
   git push
   ```

4. Give the site a minute to redeploy (GitHub Pages), then reload it and
   confirm the note appears under that guide's "Inactive in 2026" badge.

## Not covered by this skill

Anything else in this repo — tour numbers, the as-of date, layout, styling —
comes from Dodai's private data pipeline and gets synced here automatically.
If something there needs to change, ask Antun directly rather than editing it
here.
