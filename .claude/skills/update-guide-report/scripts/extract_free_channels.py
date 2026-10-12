"""
Extract FREE-tour channel stats from the `stg_checked_in` sheet and print JS
data for the Bookings tab (freeChannelStats26).

Usage:
  python3 extract_free_channels.py "1.2 Booking channels OTA.xlsx" > data-channels-2026.js
  python3 extract_free_channels.py tests/fixtures/stg_checked_in_full.csv > data-channels-2026.js

Reads a local .xlsx (the whole "1.2 Booking channels OTA" workbook — only
its `stg_checked_in` sheet is used, pass --sheet to override) or a .csv
(a single-tab export, for the test fixtures / older manual-export flow).
No live API pull; the Drive fetch is a separate step (see the
jura-guide-report-update skill).
"""

import sys
import csv
from collections import defaultdict
from datetime import datetime

DEFAULT_SHEET = 'stg_checked_in'

CITY_MAP = {'zg': 'Zagreb', 'du': 'Dubrovnik', 'st': 'Split', 'zd': 'Zadar'}

FREE_CHANNEL_MAP = {
    'web': 'web',
    'guruwalk': 'GuruWalk',
    'freetour.com': 'freetour.com',
    'civitatis': 'Civitatis',
    'sandemans': 'Sandemans',
    'walkative': 'Walkative',
}


def free_channel_bucket(platform):
    if not platform:
        return 'other'
    return FREE_CHANNEL_MAP.get(platform.strip().lower(), 'other')


def load_rows(path):
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def load_rows_from_excel(path, sheet_name=DEFAULT_SHEET):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
    ws = wb[sheet_name]
    rows = ws.iter_rows(values_only=True)
    headers = list(next(rows))
    return [dict(zip(headers, r)) for r in rows if any(v is not None for v in r)]


def empty_channel_stats():
    return {'byMonth': defaultdict(int), 'byDay': defaultdict(int)}


def build_channel_stats(rows):
    all_channels = list(FREE_CHANNEL_MAP.values()) + ['other']
    raw = defaultdict(lambda: defaultdict(lambda: {lang: empty_channel_stats() for lang in ('eng', 'esp', 'oth')}))

    for row in rows:
        if (row.get('Tour') or '').strip() != 'free':
            continue
        city_raw = (row.get('City') or '').strip()
        city = CITY_MAP.get(city_raw, city_raw or 'Unknown')
        lang = (row.get('Language') or '').strip()
        if lang not in ('eng', 'esp'):
            lang = 'oth'
        pax_val = row.get('Pax')
        pax = int(float(pax_val)) if pax_val not in (None, '') else 0
        bucket = free_channel_bucket(row.get('Platform'))

        date_val = row.get('Date')
        if not date_val:
            continue
        if hasattr(date_val, 'month'):
            month, day = date_val.month, date_val.day
        else:
            dt = datetime.strptime(str(date_val).strip(), '%d/%b/%Y')
            month, day = dt.month, dt.day

        raw[bucket][city][lang]['byMonth'][month] += pax
        raw[bucket][city][lang]['byDay'][f"{month}-{day}"] += pax

    out = {}
    for bucket in all_channels:
        city_map = {}
        for city in CITY_MAP.values():
            all_s = empty_channel_stats()
            lang_out = {}
            for lang in ('eng', 'esp', 'oth'):
                ls = raw[bucket][city][lang]
                for m, p in ls['byMonth'].items():
                    all_s['byMonth'][m] += p
                for d, p in ls['byDay'].items():
                    all_s['byDay'][d] += p
                lang_out[lang] = {'byMonth': {str(m): p for m, p in ls['byMonth'].items()}, 'byDay': dict(ls['byDay'])}
            lang_out['all'] = {'byMonth': {str(m): p for m, p in all_s['byMonth'].items()}, 'byDay': dict(all_s['byDay'])}
            city_map[city] = lang_out
        out[bucket] = city_map
    return out


def main():
    args = sys.argv[1:]
    sheet = DEFAULT_SHEET
    if '--sheet' in args:
        i = args.index('--sheet')
        sheet = args[i + 1]
        del args[i:i + 2]
    if len(args) < 1:
        print('Usage: python3 extract_free_channels.py <file.xlsx|stg_checked_in.csv> [--sheet NAME]', file=sys.stderr)
        sys.exit(1)
    import json
    path = args[0]
    rows = load_rows_from_excel(path, sheet) if path.lower().endswith('.xlsx') else load_rows(path)
    stats = build_channel_stats(rows)
    print(f'const freeChannelStats26 = {json.dumps(stats, ensure_ascii=False, indent=2)};')


if __name__ == '__main__':
    main()
