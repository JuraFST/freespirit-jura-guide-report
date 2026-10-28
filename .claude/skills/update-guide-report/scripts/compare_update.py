"""
Compare the current data-2026.js with a regenerated one before it replaces it.

Usage:
  python3 compare_update.py data-2026.js data-2026.js.new

Prints the KPI change, guides added or removed, and the as-of date the dashboard
will show. Exits 1 (stop, do not replace) if the guide count drops or a KPI total
goes to zero.
"""

import json
import re
import sys
from datetime import date

KPI_KEYS = ['guides', 'freeTours', 'paidTours', 'freePax', 'paidPax']


def load_consts(path):
    text = open(path, encoding='utf-8').read()
    consts = {}
    for block in re.split(r'\n(?=const )', text):
        m = re.match(r'const (\w+) = (.*?);\s*$', block, re.S)
        if m:
            consts[m.group(1)] = json.loads(m.group(2))
    return consts


def latest_date(guides, today):
    best = None
    for g in guides:
        for lang in g.get('stats', {}).values():
            for key in lang.get('byDay', {}):
                month, day = (int(x) for x in key.split('-'))
                d = date(today.year, month, day)
                if best is None or d > best:
                    best = d
    return min(best, today) if best else None


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    old = load_consts(sys.argv[1])
    new = load_consts(sys.argv[2])
    today = date.today()
    failed = False

    print('KPI (old -> new):')
    for k in KPI_KEYS:
        o, n = old['kpiTotals26'].get(k), new['kpiTotals26'].get(k)
        print(f'  {k:10} {o} -> {n}')
        if n in (0, None):
            failed = True
    if new['kpiTotals26']['guides'] < old['kpiTotals26']['guides']:
        failed = True

    old_names = {g['name'] for g in old['guideStats26']}
    new_names = {g['name'] for g in new['guideStats26']}
    for name in sorted(new_names - old_names):
        print(f'  added guide: {name}')
    for name in sorted(old_names - new_names):
        print(f'  removed guide: {name}')

    d = latest_date(new['guideStats26'], today)
    print(f'As-of date (latest tour day, capped at today): {d.strftime("%d.%m.%Y.") if d else "none"}')

    if failed:
        print('STOP: guide count dropped or a KPI total is zero. Do not replace data-2026.js.')
        return 1
    print('OK to replace data-2026.js.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
