#!/usr/bin/env bash
# Backup, regenerate, guard, bump last-update.js. Run from the report folder after
# "1.1 Evidencija prodaje 26.xlsx" is in place (and optionally
# "1.2 Booking channels OTA.xlsx" for the Free channel data). Does not commit.
set -euo pipefail
S=.claude/skills/update-guide-report/scripts
TS=$(date +%Y%m%d-%H%M%S)
X="1.1 Evidencija prodaje 26.xlsx"
for f in data-2025.js data-2026.js data-channels-2026.js; do cp "$f" ".backup-${f%.js}-$TS.js"; done
python3 $S/extract_guides.py --year 2026 > data-2026.js.new
python3 $S/extract_guides.py --year 2025 --sheet Evidencija > data-2025.js.new
grep -q paidChannelStats26 data-2026.js.new && grep -q paidChannelStats25 data-2025.js.new
python3 $S/compare_update.py data-2026.js data-2026.js.new | tee /tmp/compare.txt || { rm -f data-*.js.new; exit 1; }
mv data-2026.js.new data-2026.js; mv data-2025.js.new data-2025.js
rm -f "$X"
LAST=$(python3 -c "
import re
m=re.search(r'As-of date.*: (\d\d)\.(\d\d)\.(\d{4})\.',open('/tmp/compare.txt').read())
print(f'{m[3]}-{m[2]}-{m[1]}')")
sed -i.bak "s/^const REPORT_LAST_UPDATE = .*/const REPORT_LAST_UPDATE = '$LAST';/" last-update.js && rm last-update.js.bak
echo "last-update.js set to $LAST"
if [ -f "1.2 Booking channels OTA.xlsx" ]; then
  python3 $S/extract_free_channels.py "1.2 Booking channels OTA.xlsx" > data-channels-2026.js.new
  python3 - <<'E2'
import json
def total(p):
    d=json.loads(open(p).read().split("=",1)[1].rstrip(";\n "))
    return sum(sum(l["all"]["byMonth"].values()) for c in d.values() for l in c.values())
o,n=total("data-channels-2026.js"),total("data-channels-2026.js.new")
print(f"channels total: {o} -> {n}")
if n<o: raise SystemExit("STOP: channels total dropped")
E2
  mv data-channels-2026.js.new data-channels-2026.js
  rm "1.2 Booking channels OTA.xlsx"
fi
echo "Done. Verify in a browser, then commit and push."
