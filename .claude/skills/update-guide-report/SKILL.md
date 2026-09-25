---
name: update-guide-data
description: Refresh this report's tour data (data-2025.js/data-2026.js) and Bookings channel data (data-channels-2026.js) from the live FreeSpirit Google Sheets. Use when Jura asks to update the report, refresh the data, sync the latest tours, update guide numbers, or update the Bookings tab.
---

# Update guide tour data

This regenerates the report's data files from the real FreeSpirit Google
Sheets, using the same extraction scripts Dodai's own internal report uses —
just run locally against a file you download yourself, since you already
have access to both sheets.

No rebuild needed: every `data-*.js` file is loaded as its own `<script>`
tag, not bundled into `dist/app.js`, so a data-only update never touches the
app code.

## One-time setup (per computer)

1. Install Python 3 if not already installed:
   - **macOS:** `brew install python3`
   - **Windows (Git Bash):** `winget install Python.Python.3.12`
2. Install the one dependency the tour-data script needs (the Bookings
   channel script below needs nothing extra):

   ```
   pip3 install openpyxl
   ```

## Steps, every time you want to refresh tour data (Guides/Financial + Paid Bookings)

### 1. Download the latest sheet

Open the FreeSpirit Google Sheet ("1.1 Evidencija prodaje") in your browser,
then **File → Download → Microsoft Excel (.xlsx)**.

Move the downloaded file into this project folder and rename it to exactly:

```
1.1 Evidencija prodaje 26.xlsx
```

(The script looks for that exact filename. It reads both the `Evidencija`
tab (2026) and `Evidencija_25` tab (2025) from the same workbook.)

### 2. Regenerate the data

```
python3 scripts/extract_guides.py --year 2026 > data-2026.js
```

This also regenerates the **Paid** side of the Bookings tab — `data-2026.js`
includes `paidChannelStats26` alongside the guide/city numbers, since it all
comes from the same sheet.

2025 is a closed year — only re-run this if you're correcting historical
data, not for routine updates:

```
python3 scripts/extract_guides.py --year 2025 > data-2025.js
```

### 3. Update the "last updated" date

Open `last-update.js` and set `REPORT_LAST_UPDATE` to today's date
(`YYYY-MM-DD`), so the report defaults to showing data through the date it
actually covers.

### 4. Verify before pushing

Open `index.html` directly in a browser (double-click it) and check:
- The KPI numbers look right (not zero, not obviously wrong)
- The Guides tab shows current data for a guide you know changed recently
- The Bookings tab's **Paid** section shows current numbers

### 5. Commit and push

```
git add data-2026.js last-update.js
git commit -m "Update guide data $(date +%Y-%m)"
git push
```

If you also regenerated `data-2025.js`, add it to the same commit.

Reload https://jurafst.github.io/freespirit-jura-guide-report/ after about a
minute to confirm it's live.

## Steps, every time you want to refresh the Bookings tab's Free channel data

This is separate from the tour-data refresh above — it comes from a
different sheet and only affects the Bookings tab's **Free** section.

### 1. Download the latest export

Open the **"1.2 Booking channels OTA"** Google Sheet, go to the
`stg_checked_in` tab, then **File → Download → Comma Separated Values
(.csv)**.

Move the downloaded file into this project folder (any filename is fine,
you'll reference it directly in the next command).

### 2. Regenerate the data

```
python3 scripts/extract_free_channels.py <downloaded-file>.csv > data-channels-2026.js
```

**Do not touch `data-channels-2025.js`** — 2025 is fixed historical data,
transcribed once and never regenerated. This command only ever overwrites
`data-channels-2026.js`, so it's safe to run as often as you like.

### 3. Verify before pushing

Open `index.html` in a browser and check the Bookings tab's **Free**
section — numbers should look current, and the 2025 bars/table values
should be unchanged from before.

### 4. Commit and push

```
git add data-channels-2026.js
git commit -m "Update Bookings Free channel data $(date +%Y-%m)"
git push
```

Reload https://jurafst.github.io/freespirit-jura-guide-report/ after about a
minute to confirm it's live.

## Troubleshooting

**`Column "X" not found`** — a column header in one of the Google Sheets was
renamed. Check the sheet's header row against what the error message
expects.

**A guide's numbers look missing or wrong** — their name in the sheet may
have a typo or extra space compared to earlier exports. Names must match
exactly.

**`ModuleNotFoundError: openpyxl`** — run `pip3 install openpyxl` again (only
needed for the tour-data script, not the Bookings channel one).

## Not covered by this skill

`index.html`, `report.css`, `dist/app.js`, `data-channels-2025.js` — the
report's code, styling, and fixed historical data. Those come from Dodai (or
are permanently frozen) and get updated separately. Don't edit them here.
