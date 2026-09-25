"""
Extract per-guide stats and print JS data for guides.html / management.html.

Usage:
  python3 extract_guides.py                          # 2026 data (Google Sheets or local Excel)
  python3 extract_guides.py --year 2025              # 2025 data (local Excel only)
  python3 extract_guides.py --year 2026 > data-2026.js
  python3 extract_guides.py --year 2025 > data-2025.js

Data source priority:
  1. SHEET_URL env var — CSV export URL from Google Sheets (used in CI and recommended locally)
  2. Local Excel fallback — requires openpyxl and the .xlsx file present

Column positions are detected automatically from the header row.
Each guide entry now includes a `mgmt` object with financial and operational breakdowns
(revenue, vendor cost, gross margin, channel/source/DOW/time/season/pax-band/week splits).
"""

import sys
import json
import os
import csv
import io
from collections import defaultdict

SHEET_URL  = os.environ.get('SHEET_URL')
EXCEL_FILE = '1.1 Evidencija prodaje 26.xlsx'

# Parse CLI args
args = sys.argv[1:]
YEAR   = None
SHEET  = None
i = 0
while i < len(args):
    if args[i] == '--year'  and i+1 < len(args): YEAR  = int(args[i+1]); i += 2
    elif args[i] == '--sheet' and i+1 < len(args): SHEET = args[i+1];      i += 2
    else: i += 1

# Defaults — 2026 uses Evidencija, 2025 uses Evidencija_25
if YEAR is None and SHEET is None:
    YEAR, SHEET = 2026, 'Evidencija'
elif YEAR == 2025 and SHEET is None:
    SHEET = 'Evidencija_25'
elif YEAR == 2026 and SHEET is None:
    SHEET = 'Evidencija'
elif SHEET is None:
    SHEET = 'Evidencija'

CITY_MAP = {'zg': 'Zagreb', 'du': 'Dubrovnik', 'st': 'Split', 'zd': 'Zadar'}
LANG_MAP = {'eng': 'eng', 'esp': 'esp', 'fra': 'fra'}
MONTH_NAMES = {1:'Sij',2:'Velj',3:'Ožu',4:'Tra',5:'Svi',6:'Lip',7:'Srp',8:'Kol',9:'Ruj',10:'Lis',11:'Stu',12:'Pro'}

# Canonical guide order (city → [names])
GUIDE_ORDER = [
    ('Zagreb', [
        'Darko Crnolatac', 'Luka Pelicarić', 'Vid Dorić', 'Diana Bolić',
        'Ivana Čakarić', 'Katarina Novoselac', 'Iva Pavlović', 'Nikolina Folnović',
        'Katija Crnčević', 'Kristina Božić', 'Ena Matacun', 'Nadir Ivanović',
        'Antonio Sičić', 'Dora Mlinarek Dominik', 'Josipa Šiklić',
        'Alan Sopta', 'Tomislav Štefanić', 'Daria Justinijanović', 'Doris Cvetko P',
    ]),
    ('Dubrovnik', [
        'Marin Kalauz', 'Pero Kusalo', 'Andrea Rendulić', 'Sara Žanetić',
        'Maja Musulin', 'Nikolina Vidojević', 'Ivo Miličić', 'Lorena Arias',
        'Nikolina Vukanović', 'Romana Tomičić', 'Emma Martinović',
    ]),
    ('Split', [
        'Bruno Beara', 'Ivana Čagalj', 'Lorena Ćelić', 'Marija Močić',
        'Marina Krolo', 'Petra Lučev', 'Boris Čerina', 'Maja Baranović Ordulj',
    ]),
    ('Zadar', [
        'Andrija Grubić', 'Iva Zaplatić', 'Matea Duka', 'Tonka Baričević',
        'Nikolina Kuzman',
    ]),
]

# ── Production stats helpers ──────────────────────────────────────────────────

def empty_stats():
    return {
        'free':  {'tours': 0, 'pax': 0},
        'paid':  {'tours': 0, 'pax': 0},
        'byType': defaultdict(lambda: {'tours': 0, 'pax': 0}),
        'byMonth': defaultdict(lambda: {
            'free': {'tours': 0, 'pax': 0},
            'paid': {'tours': 0, 'pax': 0},
        }),
        'byDay': defaultdict(lambda: {
            'free': {'tours': 0, 'pax': 0},
            'paid': {'tours': 0, 'pax': 0},
        }),
        'byMonthType': defaultdict(lambda: defaultdict(lambda: {'tours': 0, 'pax': 0})),
        'byDayType':   defaultdict(lambda: defaultdict(lambda: {'tours': 0, 'pax': 0})),
    }

def add_row(stats, is_free, tour_type, month, pax, day=None):
    kind = 'free' if is_free else 'paid'
    stats[kind]['tours'] += 1
    stats[kind]['pax'] += pax
    if not is_free:
        stats['byType'][tour_type]['tours'] += 1
        stats['byType'][tour_type]['pax'] += pax
        stats['byMonthType'][month][tour_type]['tours'] += 1
        stats['byMonthType'][month][tour_type]['pax'] += pax
    stats['byMonth'][month][kind]['tours'] += 1
    stats['byMonth'][month][kind]['pax'] += pax
    if day is not None:
        key = f"{month}-{day}"
        stats['byDay'][key][kind]['tours'] += 1
        stats['byDay'][key][kind]['pax'] += pax
        if not is_free:
            stats['byDayType'][key][tour_type]['tours'] += 1
            stats['byDayType'][key][tour_type]['pax'] += pax

def merge_stats(all_stats, lang_stats):
    for kind in ('free', 'paid'):
        all_stats[kind]['tours'] += lang_stats[kind]['tours']
        all_stats[kind]['pax'] += lang_stats[kind]['pax']
    for t, v in lang_stats['byType'].items():
        all_stats['byType'][t]['tours'] += v['tours']
        all_stats['byType'][t]['pax'] += v['pax']
    for m, mv in lang_stats['byMonth'].items():
        for kind in ('free', 'paid'):
            all_stats['byMonth'][m][kind]['tours'] += mv[kind]['tours']
            all_stats['byMonth'][m][kind]['pax'] += mv[kind]['pax']
    for d, dv in lang_stats['byDay'].items():
        for kind in ('free', 'paid'):
            all_stats['byDay'][d][kind]['tours'] += dv[kind]['tours']
            all_stats['byDay'][d][kind]['pax'] += dv[kind]['pax']
    for m, tv in lang_stats['byMonthType'].items():
        for t, v in tv.items():
            all_stats['byMonthType'][m][t]['tours'] += v['tours']
            all_stats['byMonthType'][m][t]['pax'] += v['pax']
    for d, tv in lang_stats['byDayType'].items():
        for t, v in tv.items():
            all_stats['byDayType'][d][t]['tours'] += v['tours']
            all_stats['byDayType'][d][t]['pax'] += v['pax']

def to_plain(stats):
    months_present = sorted(stats['byMonth'].keys())
    return {
        'free': stats['free'],
        'paid': stats['paid'],
        'byType': {k: dict(v) for k, v in stats['byType'].items()},
        'byMonth': {
            m: {
                'name': MONTH_NAMES.get(m, str(m)),
                'free': dict(stats['byMonth'][m]['free']),
                'paid': dict(stats['byMonth'][m]['paid']),
            }
            for m in months_present
        },
        'byDay': {
            k: {'free': dict(v['free']), 'paid': dict(v['paid'])}
            for k, v in stats['byDay'].items()
        },
        'byMonthType': {
            str(m): {t: dict(v) for t, v in tv.items()}
            for m, tv in stats['byMonthType'].items()
        },
        'byDayType': {
            k: {t: dict(v) for t, v in tv.items()}
            for k, tv in stats['byDayType'].items()
        },
    }

# ── Management stats helpers ──────────────────────────────────────────────────

def _fin_entry():
    return {
        'tours': 0, 'pax': 0,
        'revenue': 0.0, 'vendorCost': 0.0, 'grossMargin': 0.0,
        'tourCost': 0.0, 'commissionCost': 0.0,
        'processingFee': 0.0, 'vatAmount': 0.0, 'amountBeforeTax': 0.0,
    }

_FIN_FIELDS = ('tours', 'pax', 'revenue', 'vendorCost', 'grossMargin',
               'tourCost', 'commissionCost', 'processingFee', 'vatAmount', 'amountBeforeTax')

def empty_mgmt():
    return {
        'revenue': 0.0, 'vendorCost': 0.0, 'grossMargin': 0.0,
        'tourCost': 0.0, 'commissionCost': 0.0,
        'processingFee': 0.0, 'vatAmount': 0.0, 'amountBeforeTax': 0.0,
        'byChannel':       defaultdict(_fin_entry),
        'bySource':        defaultdict(_fin_entry),
        'byDow':           defaultdict(_fin_entry),
        'byTime':          defaultdict(_fin_entry),
        'bySeason':        defaultdict(_fin_entry),
        'byPaxBand':       defaultdict(_fin_entry),
        'byWeek':          defaultdict(_fin_entry),
        'byMonth':         defaultdict(_fin_entry),
        'byBillingMethod': defaultdict(_fin_entry),
        'byPaymentMethod': defaultdict(_fin_entry),
        'byGuidePaxBand':  defaultdict(_fin_entry),
        'byPriceType':     defaultdict(_fin_entry),
        'byTourType':      defaultdict(_fin_entry),
    }

_MGMT_DIMS = (
    'byChannel', 'bySource', 'byDow', 'byTime', 'bySeason', 'byPaxBand', 'byWeek', 'byMonth',
    'byBillingMethod', 'byPaymentMethod', 'byGuidePaxBand', 'byPriceType', 'byTourType',
)

def _add_fin(bucket, tours, pax, revenue, vendor_cost, gross_margin,
             tour_cost=0.0, commission_cost=0.0, processing_fee=0.0,
             vat_amount=0.0, amount_before_tax=0.0):
    bucket['tours'] += tours
    bucket['pax'] += pax
    bucket['revenue'] += revenue
    bucket['vendorCost'] += vendor_cost
    bucket['grossMargin'] += gross_margin
    bucket['tourCost'] += tour_cost
    bucket['commissionCost'] += commission_cost
    bucket['processingFee'] += processing_fee
    bucket['vatAmount'] += vat_amount
    bucket['amountBeforeTax'] += amount_before_tax

def add_mgmt_row(mgmt, pax, revenue, vendor_cost, gross_margin,
                 channel, source, dow, time_hour, season, pax_band, week, month,
                 tour_cost=0.0, commission_cost=0.0, processing_fee=0.0,
                 vat_amount=0.0, amount_before_tax=0.0,
                 billing_method=None, payment_method=None,
                 guide_pax_band=None, price_type=None, tour_type=None):
    mgmt['revenue'] += revenue
    mgmt['vendorCost'] += vendor_cost
    mgmt['grossMargin'] += gross_margin
    mgmt['tourCost'] += tour_cost
    mgmt['commissionCost'] += commission_cost
    mgmt['processingFee'] += processing_fee
    mgmt['vatAmount'] += vat_amount
    mgmt['amountBeforeTax'] += amount_before_tax

    fin_kw = dict(tour_cost=tour_cost, commission_cost=commission_cost,
                  processing_fee=processing_fee, vat_amount=vat_amount,
                  amount_before_tax=amount_before_tax)

    def upd(bucket_dict, key):
        _add_fin(bucket_dict[key], 1, pax, revenue, vendor_cost, gross_margin, **fin_kw)

    if channel: upd(mgmt['byChannel'], channel)
    if source:  upd(mgmt['bySource'],  source)
    if dow:     upd(mgmt['byDow'],     dow)
    if time_hour is not None: upd(mgmt['byTime'], str(time_hour))
    if season:  upd(mgmt['bySeason'],  season)
    if pax_band: upd(mgmt['byPaxBand'], pax_band)
    if week is not None: upd(mgmt['byWeek'], str(int(week)))
    if month is not None: upd(mgmt['byMonth'], str(int(month)))
    if billing_method: upd(mgmt['byBillingMethod'], billing_method)
    if payment_method: upd(mgmt['byPaymentMethod'], payment_method)
    if guide_pax_band: upd(mgmt['byGuidePaxBand'],  guide_pax_band)
    if price_type:     upd(mgmt['byPriceType'],     price_type)
    if tour_type:      upd(mgmt['byTourType'],      tour_type)

def to_plain_mgmt(mgmt):
    def plain_bucket(d):
        return {
            k: {fk: round(fv, 2) if isinstance(fv, float) else fv
                for fk, fv in v.items()}
            for k, v in d.items()
        }
    out = {
        'revenue':         round(mgmt['revenue'], 2),
        'vendorCost':      round(mgmt['vendorCost'], 2),
        'grossMargin':     round(mgmt['grossMargin'], 2),
        'tourCost':        round(mgmt['tourCost'], 2),
        'commissionCost':  round(mgmt['commissionCost'], 2),
        'processingFee':   round(mgmt['processingFee'], 2),
        'vatAmount':       round(mgmt['vatAmount'], 2),
        'amountBeforeTax': round(mgmt['amountBeforeTax'], 2),
    }
    for dim in _MGMT_DIMS:
        out[dim] = plain_bucket(mgmt[dim])
    return out

def merge_mgmt(total, guide_mgmt):
    for f in ('revenue', 'vendorCost', 'grossMargin', 'tourCost', 'commissionCost',
              'processingFee', 'vatAmount', 'amountBeforeTax'):
        total[f] += guide_mgmt[f]
    for dim in _MGMT_DIMS:
        for k, v in guide_mgmt[dim].items():
            t = total[dim][k]
            for fk in _FIN_FIELDS:
                t[fk] += v[fk]

# ── Data loading ──────────────────────────────────────────────────────────────

def _load_rows_from_url(url):
    import urllib.request
    with urllib.request.urlopen(url) as resp:
        content = resp.read().decode('utf-8')
    rows = list(csv.reader(io.StringIO(content)))
    return rows[0], rows[1:]

def _load_rows_from_excel(path, sheet_name):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet_name]
    all_rows = list(ws.iter_rows(min_row=1, values_only=True))
    return list(all_rows[0]), [list(r) for r in all_rows[1:]]

def _val(v):
    if v is None: return None
    s = str(v).strip()
    return s if s else None

def _int(v):
    if v is None: return None
    try: return int(float(str(v).strip()))
    except (ValueError, TypeError): return None

def _float(v):
    if v is None: return 0.0
    try: return float(str(v).strip())
    except (ValueError, TypeError): return 0.0

def _time_hour(v):
    """Return the hour integer from a time cell, or None."""
    if v is None: return None
    if hasattr(v, 'hour'): return v.hour
    s = str(v).strip()
    if not s: return None
    for fmt in ('%H:%M:%S', '%H:%M'):
        try:
            from datetime import datetime
            return datetime.strptime(s, fmt).hour
        except ValueError:
            pass
    return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if SHEET_URL:
        headers, data_rows = _load_rows_from_url(SHEET_URL)
    else:
        headers, data_rows = _load_rows_from_excel(EXCEL_FILE, SHEET)

    def col(name):
        try: return headers.index(name)
        except ValueError: raise ValueError(f'Column "{name}" not found. Headers: {headers}')

    def optcol(name):
        try: return headers.index(name)
        except ValueError: return None

    C_TOUR    = col('Tour')
    C_CITY    = col('City')
    C_LANG    = col('Language')
    C_TOUR_NO = col('Tour no.')
    C_VENDOR  = col('Vendor')
    C_MONTH   = col('Month')
    C_PAX     = col('Total guide pax')
    C_DATE    = optcol('Date')
    C_YEAR    = optcol('Year')

    # Management columns (present in Evidencija, may be absent in URL exports)
    C_PAX_RAW  = optcol('Pax')
    C_DAY      = optcol('Day')
    C_TIME     = optcol('Time')
    C_CHANNEL  = optcol('Sales channel')
    C_SOURCE   = optcol('Sales source')
    C_CHARGED  = optcol('Charged amount')
    C_VCOST    = optcol('Vendor cost')
    C_GM       = optcol('Gross margin')
    C_WEEK     = optcol('Week')
    C_SEASON   = optcol('Season')
    C_PAXBAND  = optcol('Pax band')
    C_BILLING     = optcol('Billing method')
    C_PAYMENT     = optcol('Payment method')
    C_TOUR_COST   = optcol('Tour cost')
    C_COMM_COST   = optcol('Commission cost')
    C_PROC_FEE    = optcol('Payment processing fee')
    C_AMT_BT      = optcol('Amount before tax')
    C_VAT_AMT     = optcol('VAT amount')
    C_UNIT_PRICE  = optcol('Unit price')
    C_PRICE_TYPE  = optcol('Price type')
    C_GUIDE_PBAND = optcol('Guide pax band')

    HAS_MGMT = all(c is not None for c in (C_CHANNEL, C_CHARGED, C_VCOST, C_GM))

    # raw[vendor][lang] = stats ; mgmt_raw[vendor] = mgmt
    raw      = defaultdict(lambda: {lang: empty_stats() for lang in ('eng', 'esp', 'fra')})
    mgmt_raw = defaultdict(empty_mgmt)
    # raw_city[city][lang] = stats — keyed by each row's own City column (not the guide's home city),
    # so city totals stay correct regardless of which guide covered the tour.
    raw_city = defaultdict(lambda: {lang: empty_stats() for lang in ('eng', 'esp', 'fra')})

    for row in data_rows:
        vendor = _val(row[C_VENDOR])
        if not vendor or vendor == 'vanjski vodič':
            continue
        tour_no = _int(row[C_TOUR_NO])
        if tour_no != 1:
            continue

        if C_YEAR is not None and YEAR is not None:
            row_year = _int(row[C_YEAR])
            if row_year and row_year != YEAR:
                continue

        tour  = _val(row[C_TOUR])
        lang  = _val(row[C_LANG])
        month = _int(row[C_MONTH])
        pax   = _int(row[C_PAX]) or 0

        if lang not in ('eng', 'esp', 'fra'):
            lang = 'eng'
        if month is None:
            continue

        day = None
        if C_DATE is not None:
            date_val = row[C_DATE]
            if date_val is not None:
                if hasattr(date_val, 'day'):
                    day = date_val.day
                else:
                    s = str(date_val).strip()
                    if s:
                        from datetime import datetime
                        for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%m/%d/%Y', '%d/%b/%y', '%d/%b/%Y'):
                            try: day = datetime.strptime(s, fmt).day; break
                            except ValueError: pass

        is_free = (tour == 'free')
        add_row(raw[vendor][lang], is_free, tour, month, pax, day)

        city_raw = _val(row[C_CITY])
        city = CITY_MAP.get(city_raw, city_raw or 'Unknown')
        add_row(raw_city[city][lang], is_free, tour, month, pax, day)

        if HAS_MGMT:
            raw_pax    = _int(row[C_PAX_RAW]) if C_PAX_RAW is not None else pax
            revenue    = _float(row[C_CHARGED])
            vendor_cost = _float(row[C_VCOST])
            gross_margin = _float(row[C_GM])
            channel    = _val(row[C_CHANNEL])
            source     = _val(row[C_SOURCE])
            dow        = _val(row[C_DAY]) if C_DAY is not None else None
            time_hour  = _time_hour(row[C_TIME]) if C_TIME is not None else None
            season     = _val(row[C_SEASON]).lower() if C_SEASON is not None and _val(row[C_SEASON]) else None
            pax_band   = _val(row[C_PAXBAND]) if C_PAXBAND is not None else None
            week       = _float(row[C_WEEK]) if C_WEEK is not None else None
            tour_cost       = _float(row[C_TOUR_COST])   if C_TOUR_COST   is not None else 0.0
            commission_cost = _float(row[C_COMM_COST])   if C_COMM_COST   is not None else 0.0
            processing_fee  = _float(row[C_PROC_FEE])    if C_PROC_FEE    is not None else 0.0
            vat_amount      = _float(row[C_VAT_AMT])     if C_VAT_AMT     is not None else 0.0
            amount_before_tax = _float(row[C_AMT_BT])    if C_AMT_BT      is not None else 0.0
            billing_method  = _val(row[C_BILLING])       if C_BILLING     is not None else None
            payment_method  = _val(row[C_PAYMENT])       if C_PAYMENT     is not None else None
            guide_pax_band  = _val(row[C_GUIDE_PBAND])   if C_GUIDE_PBAND is not None else None
            price_type      = _val(row[C_PRICE_TYPE])    if C_PRICE_TYPE  is not None else None

            booking_pax = raw_pax if raw_pax else pax
            add_mgmt_row(
                mgmt_raw[vendor],
                booking_pax, revenue, vendor_cost, gross_margin,
                channel, source, dow, time_hour, season, pax_band, week, month,
                tour_cost=tour_cost, commission_cost=commission_cost,
                processing_fee=processing_fee, vat_amount=vat_amount,
                amount_before_tax=amount_before_tax,
                billing_method=billing_method, payment_method=payment_method,
                guide_pax_band=guide_pax_band, price_type=price_type,
                tour_type=tour if not is_free else None,
            )

    # Build output list following canonical order
    result = []
    seen = set()

    for city, names in GUIDE_ORDER:
        for name in names:
            if name not in raw:
                continue
            seen.add(name)
            all_s = empty_stats()
            lang_stats = {}
            for lang in ('eng', 'esp', 'fra'):
                ls = raw[name][lang]
                merge_stats(all_s, ls)
                lang_stats[lang] = to_plain(ls)
            lang_stats['all'] = to_plain(all_s)
            entry = {'name': name, 'city': city, 'stats': lang_stats}
            if HAS_MGMT:
                entry['mgmt'] = to_plain_mgmt(mgmt_raw[name])
            result.append(entry)

    for name in raw:
        if name in seen:
            continue
        all_s = empty_stats()
        lang_stats = {}
        for lang in ('eng', 'esp', 'fra'):
            ls = raw[name][lang]
            merge_stats(all_s, ls)
            lang_stats[lang] = to_plain(ls)
        lang_stats['all'] = to_plain(all_s)
        entry = {'name': name, 'city': 'Unknown', 'stats': lang_stats}
        if HAS_MGMT:
            entry['mgmt'] = to_plain_mgmt(mgmt_raw[name])
        result.append(entry)

    # City totals — built from each row's own City column, independent of guide identity
    city_stats = {}
    for city, langs in raw_city.items():
        all_s = empty_stats()
        lang_stats = {}
        for lang in ('eng', 'esp', 'fra'):
            ls = langs[lang]
            merge_stats(all_s, ls)
            lang_stats[lang] = to_plain(ls)
        lang_stats['all'] = to_plain(all_s)
        city_stats[city] = lang_stats

    # KPI totals
    total_free_tours = sum(g['stats']['all']['free']['tours'] for g in result)
    total_paid_tours = sum(g['stats']['all']['paid']['tours'] for g in result)
    total_free_pax   = sum(g['stats']['all']['free']['pax']   for g in result)
    total_paid_pax   = sum(g['stats']['all']['paid']['pax']   for g in result)
    total_guides     = len(result)

    kpi = {
        'guides': total_guides,
        'freeTours': total_free_tours,
        'paidTours': total_paid_tours,
        'freePax': total_free_pax,
        'paidPax': total_paid_pax,
    }

    if HAS_MGMT:
        total_mgmt = empty_mgmt()
        for g in result:
            merge_mgmt(total_mgmt, g['mgmt'])
        kpi['revenue']          = round(total_mgmt['revenue'], 2)
        kpi['vendorCost']       = round(total_mgmt['vendorCost'], 2)
        kpi['grossMargin']      = round(total_mgmt['grossMargin'], 2)
        kpi['tourCost']         = round(total_mgmt['tourCost'], 2)
        kpi['commissionCost']   = round(total_mgmt['commissionCost'], 2)
        kpi['processingFee']    = round(total_mgmt['processingFee'], 2)
        kpi['vatAmount']        = round(total_mgmt['vatAmount'], 2)
        kpi['amountBeforeTax']  = round(total_mgmt['amountBeforeTax'], 2)
        kpi['mgmt'] = to_plain_mgmt(total_mgmt)

    def js(obj):
        return json.dumps(obj, ensure_ascii=False, indent=2)

    suffix = str(YEAR)[-2:] if YEAR else ''
    print(f'const kpiTotals{suffix} = {js(kpi)};')
    print()
    print(f'const guideStats{suffix} = {js(result)};')
    print()
    print(f'const cityStats{suffix} = {js(city_stats)};')

if __name__ == '__main__':
    main()
