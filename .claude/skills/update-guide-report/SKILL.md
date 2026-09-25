---
name: update-guide-data
description: Refresh this report's tour data (data-2025.js/data-2026.js) from the live FreeSpirit Google Sheet. Use when Jura asks to update the report, refresh the data, sync the latest tours, or update guide numbers.
---

# Update guide tour data

This regenerates `data-2026.js` (and, rarely, `data-2025.js`) from the real
FreeSpirit Google Sheet, using the same extraction script Dodai's own
internal report uses — just run locally against a file you download
yourself, since you already have access to that sheet.

No rebuild needed: `data-2026.js` is loaded as its own `<script>` tag, not
bundled into `dist/app.js`, so a data-only update never touches the app code.

## One-time setup (per computer)

1. Install Python 3 if not already installed:
   - **macOS:** `brew install python3`
   - **Windows (Git Bash):** `winget install Python.Python.3.12`
2. Install the one dependency the script needs:

   ```
   pip3 install openpyxl
   ```

## Steps, every time you want to refresh the data

### 1. Download the latest sheet

Open the FreeSpirit Google Sheet in your browser, then
**File → Download → Microsoft Excel (.xlsx)**.

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

### 5. Commit and push

```
git add data-2026.js last-update.js
git commit -m "Update guide data $(date +%Y-%m)"
git push
```

If you also regenerated `data-2025.js`, add it to the same commit.

Reload https://jurafst.github.io/freespirit-jura-guide-report/ after about a
minute to confirm it's live.

## Troubleshooting

**`Column "X" not found`** — a column header in the Google Sheet was renamed.
Check the sheet's header row against what the error message expects.

**A guide's numbers look missing or wrong** — their name in the sheet may
have a typo or extra space compared to earlier exports. Names must match
exactly.

**`ModuleNotFoundError: openpyxl`** — run `pip3 install openpyxl` again.

## Not covered by this skill

`index.html`, `report.css`, `dist/app.js` — the report's code and styling.
Those come from Dodai and get updated separately. Don't edit them here.
