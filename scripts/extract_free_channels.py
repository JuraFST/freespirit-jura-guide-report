"""
Extract FREE-tour channel stats from a `stg_checked_in` CSV export and print
JS data for the Bookings tab (freeChannelStats26).

Usage:
  python3 extract_free_channels.py tests/fixtures/stg_checked_in_full.csv > data-channels-2026.js

Source: Google Sheet "1.2 Booking channels OTA", tab `stg_checked_in`.
Export it as CSV first (File -> Download -> Comma Separated Values) — see
CONTEXT.md's "FREE channel data" entry for the sheet URL. No live API pull;
this only reads a local CSV export.
"""

import sys
import csv
from collections import defaultdict
from datetime import datetime

CITY_MAP = {'zg': 'Zagreb', 'du': 'Dubrovnik', 'st': 'Split', 'zd': 'Zadar'}

FREE_CHANNEL_MAP = {
    'web': 'web',
    'guruwalk': 'GuruWalk',
    'freetour.com': 'freetour.com',
    'civitatis': 'Civitatis',
    'buendia': 'Buendia',
    'sandemans': 'Sandemans',
    'walkative': 'Walkative',
    'viabam': 'Viabam',
}


def free_channel_bucket(platform):
    if not platform:
        return 'other'
    return FREE_CHANNEL_MAP.get(platform.strip().lower(), 'other')


def load_rows(path):
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def empty_channel_stats():
    return {'byMonth': defaultdict(int), 'byDay': defaultdict(int)}


def build_channel_stats(rows):
    all_channels = list(FREE_CHANNEL_MAP.values()) + ['other']
    raw = defaultdict(lambda: defaultdict(lambda: {lang: empty_channel_stats() for lang in ('eng', 'esp', 'fra')}))

    for row in rows:
        if (row.get('Tour') or '').strip() != 'free':
            continue
        city_raw = (row.get('City') or '').strip()
        city = CITY_MAP.get(city_raw, city_raw or 'Unknown')
        lang = (row.get('Language') or '').strip()
        if lang not in ('eng', 'esp', 'fra'):
            lang = 'eng'
        pax_str = (row.get('Pax') or '').strip()
        pax = int(float(pax_str)) if pax_str else 0
        bucket = free_channel_bucket(row.get('Platform'))

        date_str = (row.get('Date') or '').strip()
        if not date_str:
            continue
        dt = datetime.strptime(date_str, '%d/%b/%Y')
        month, day = dt.month, dt.day

        raw[bucket][city][lang]['byMonth'][month] += pax
        raw[bucket][city][lang]['byDay'][f"{month}-{day}"] += pax

    out = {}
    for bucket in all_channels:
        city_map = {}
        for city in CITY_MAP.values():
            all_s = empty_channel_stats()
            lang_out = {}
            for lang in ('eng', 'esp', 'fra'):
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
    if len(sys.argv) < 2:
        print('Usage: python3 extract_free_channels.py <stg_checked_in.csv>', file=sys.stderr)
        sys.exit(1)
    import json
    rows = load_rows(sys.argv[1])
    stats = build_channel_stats(rows)
    print(f'const freeChannelStats26 = {json.dumps(stats, ensure_ascii=False, indent=2)};')


if __name__ == '__main__':
    main()
