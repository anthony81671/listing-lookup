'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedListing } from '@/types';
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PropertyBanner } from '@/components/property-banner';

const PAGE_SIZE = 25;
const FETCH_LIMIT = 300;

// ---- Normalizers ----

function normalizeIls(row: Record<string, string | null | number>): UnifiedListing {
  return {
    report_id: Number(row.id),
    source: 'ILS',
    listing_number: (row.ils_number as string) ?? null,
    listing_date: (row.date as string) ?? null,
    street_address: (row.address as string) ?? null,
    suite: (row.suite_bldg as string) ?? null,
    city: (row.city as string) ?? null,
    state: 'CA',
    market: (row.market as string) ?? null,
    submarket: (row.submarket as string) ?? null,
    property_name: (row.business_park as string) ?? null,
    building_sqft: (row.sq_ft as string) ?? null,
    available_sqft: (row.sq_ft as string) ?? null,
    office_sqft: (row.office_sf as string) ?? null,
    clear_height: (row.clear_ht as string) ?? null,
    dh_doors: (row.dh as string) ?? null,
    gl_doors: (row.gl as string) ?? null,
    sprinklers: (row.sprklr as string) ?? null,
    rail_access: (row.rail as string) ?? null,
    amperage: (row.amps as string) ?? null,
    parking_spaces: (row.parking as string) ?? null,
    parking_ratio: null,
    yard_space: (row.yard as string) ?? null,
    rate_per_sf: (row.rate as string) ?? null,
    rent_type: (row.rent_type as string) ?? null,
    sale_price_per_sf: (row.sale_price_sf as string) ?? null,
    total_sale_price: (row.sale_price as string) ?? null,
    highlights: (row.listing_highlights as string) ?? null,
    comments: (row.listing_comment as string) ?? null,
    company_agent: (row.company_agent as string) ?? null,
    listing_status: (row.status as string) ?? null,
    photo_url: (row.photo_url as string) ?? null,
    pdf_url: (row.pdf_url as string) ?? null,
    property_link: null,
    marketing_flyer: null,
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  };
}

function normalizeAir(row: Record<string, string | null | number>): UnifiedListing {
  return {
    report_id: Number(row.id) + 1_000_000,
    source: 'AIR',
    listing_number: (row.listing_number as string) ?? null,
    listing_date: (row.date as string) ?? null,
    street_address: (row.address as string) ?? null,
    suite: (row.suite_bldg as string) ?? null,
    city: (row.city as string) ?? null,
    state: (row.state as string) ?? 'CA',
    market: (row.market as string) ?? null,
    submarket: (row.submarket as string) ?? null,
    property_name: (row.business_park as string) ?? null,
    building_sqft: (row.building_sf as string) ?? null,
    available_sqft: (row.available_sf as string) ?? null,
    office_sqft: (row.office_sf as string) ?? null,
    clear_height: (row.clear_height as string) ?? null,
    dh_doors: (row.dh as string) ?? null,
    gl_doors: (row.gl as string) ?? null,
    sprinklers: (row.sprinkler as string) ?? null,
    rail_access: (row.rail as string) ?? null,
    amperage: (row.amps as string) ?? null,
    parking_spaces: (row.parking_spaces as string) ?? null,
    parking_ratio: (row.parking_ratio as string) ?? null,
    yard_space: (row.yard as string) ?? null,
    rate_per_sf: cleanAirRate((row.rate_sf as string) ?? null),
    rent_type: extractAirRentType((row.type as string) ?? null, (row.rate_sf as string) ?? null),
    sale_price_per_sf: (row.price_sf as string) ?? null,
    total_sale_price: (row.total_price as string) ?? null,
    highlights: (row.highlights as string) ?? null,
    comments: (row.notes as string) ?? null,
    company_agent: (row.company_agent as string) ?? null,
    listing_status: (row.status as string) ?? null,
    photo_url: null,
    pdf_url: null,
    property_link: (row.property_link as string) ?? null,
    marketing_flyer: (row.marketing_flyer as string) ?? null,
    created_at: (row.created_at as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  };
}

// AIR Hot Sheet "Type" column contains values like "For Lease NNN" or "For Lease MG".
// Rate/SF can also carry a suffix like "1.25 NNN". Parse rent type from either field.
const RENT_TYPE_RE = /\b(NNN|FSG|MG|IG|G|Net|Gross|Modified)\b/i;

function extractAirRentType(typeCol: string | null, rateSf: string | null): string | null {
  for (const src of [typeCol, rateSf]) {
    const m = src?.match(RENT_TYPE_RE);
    if (m) {
      const v = m[1].toUpperCase();
      if (v === 'NET') return 'NNN';
      if (v === 'GROSS') return 'G';
      if (v === 'MODIFIED') return 'MG';
      return v;
    }
  }
  return null;
}

// Strip rent type suffix from rate value so "1.25 NNN" → "1.25"
function cleanAirRate(rate: string | null): string | null {
  if (!rate?.trim()) return null;
  return rate.replace(RENT_TYPE_RE, '').trim() || null;
}

function sortByDate(a: UnifiedListing, b: UnifiedListing): number {
  const da = a.listing_date ? new Date(a.listing_date).getTime() : 0;
  const db = b.listing_date ? new Date(b.listing_date).getTime() : 0;
  return db - da;
}

// ---- Helpers ----

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>{children}</div>
);

function fmt(val: string | null | undefined, fallback = '—') {
  return val?.trim() || fallback;
}

function fmtNum(val: string | null | undefined) {
  if (!val?.trim()) return '—';
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? val : n.toLocaleString();
}

// ILS stores rates as "$1.50"; AIR stores as "1.50" — avoid double-$
function fmtRate(val: string | null | undefined) {
  if (!val?.trim()) return '—';
  if (val.startsWith('$') || isNaN(parseFloat(val))) return val; // already has $ or is TBD/NFL
  return `$${val}`;
}

// ---- Property Lookup Panel ----

type LookupResults = {
  ihLease: any[]; ihSale: any[]; ils: any[];
  airComps: any[]; airProps: any[]; airList: any[];
};

const SOURCE_COLORS: Record<string, string> = {
  'IH Lease': 'bg-emerald-100 text-emerald-800',
  'IH Sale':  'bg-amber-100 text-amber-800',
  'ILS':      'bg-indigo-100 text-indigo-700',
  'AIR Comp': 'bg-purple-100 text-purple-800',
  'AIR Prop': 'bg-slate-100 text-slate-600',
  'AIR List': 'bg-orange-100 text-orange-700',
};

function fmtCurrency(v: any) {
  if (v == null || v === '') return '';
  const n = Number(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? String(v) : `$${n.toFixed(2)}`;
}
function fmtLookupNum(v: any) {
  if (v == null || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString();
}
function fmtDate(v: string | null | undefined) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}-${d.getFullYear()}`;
}

function buildUnifiedRows(r: LookupResults) {
  type Row = { source: string; address: string; city: string; sf: string; rate: string; type: string; date: string; party: string; _raw: any; _src: keyof LookupResults };
  const rows: Row[] = [];
  const addr = (x: any) => [x.streetnumber1, x.streetdirection, x.streetname, x.streetsuffix].filter(Boolean).join(' ')
    || [x.street_number1, x.street_direction, x.street_name, x.street_suffix].filter(Boolean).join(' ')
    || x.address_full || x.address || '';

  for (const x of r.ihLease) rows.push({ source: 'IH Lease', address: addr(x), city: x.city ?? '', sf: fmtLookupNum(x.leasedsqft), rate: fmtCurrency(x.rentpersqft), type: x.renttype ?? '', date: fmtDate(x.transactiondate), party: x.lessee ?? '', _raw: x, _src: 'ihLease' });
  for (const x of r.ihSale)  rows.push({ source: 'IH Sale',  address: addr(x), city: x.city ?? '', sf: fmtLookupNum(x.buildingsqft), rate: fmtCurrency(x.salepricepersqft), type: 'Sale', date: fmtDate(x.transactiondate), party: x.buyer ?? '', _raw: x, _src: 'ihSale' });
  for (const x of r.ils)     rows.push({ source: 'ILS',      address: x.address ?? addr(x), city: x.city ?? '', sf: fmtLookupNum(x.sq_ft), rate: fmtCurrency(x.rate), type: x.rent_type ?? '', date: fmtDate(x.date), party: x.company_agent ?? '', _raw: x, _src: 'ils' });
  for (const x of r.airComps) rows.push({ source: 'AIR Comp', address: x.address_full ?? addr(x), city: x.city ?? '', sf: fmtLookupNum(x.building_sf), rate: fmtCurrency(x.leased_rate || x.price_per_sf), type: x.lease_type ?? '', date: fmtDate(x.lease_signed_date), party: x.primary_agent ?? '', _raw: x, _src: 'airComps' });
  for (const x of r.airProps) rows.push({ source: 'AIR Prop', address: x.address ?? addr(x), city: x.city ?? '', sf: fmtLookupNum(x.building_sf), rate: '', type: '', date: '', party: '', _raw: x, _src: 'airProps' });
  for (const x of r.airList)  rows.push({ source: 'AIR List', address: x.address ?? addr(x), city: x.city ?? '', sf: fmtLookupNum(x.available_sf), rate: fmtCurrency(x.rate_sf), type: x.rent_type ?? '', date: fmtDate(x.date), party: x.company_agent ?? '', _raw: x, _src: 'airList' });
  return rows;
}

function LookupTable({ rows, activeTab, onRowClick }: { rows: ReturnType<typeof buildUnifiedRows>; activeTab: string; onRowClick: (row: ReturnType<typeof buildUnifiedRows>[number]) => void }) {
  const filtered = activeTab === 'all' ? rows : rows.filter(r => {
    if (activeTab === 'ihLease') return r._src === 'ihLease';
    if (activeTab === 'ihSale')  return r._src === 'ihSale';
    if (activeTab === 'ils')     return r._src === 'ils';
    if (activeTab === 'airComps') return r._src === 'airComps';
    if (activeTab === 'airProps') return r._src === 'airProps';
    if (activeTab === 'airList')  return r._src === 'airList';
    return true;
  });
  if (!filtered.length) return <div className="py-6 text-center text-sm text-slate-400">No records found.</div>;
  return (
    <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500">Source</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500">Address</th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500">City</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500">SF</th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500">Rate/Price</th>
            <th className="px-3 py-2 font-semibold text-slate-500">Type</th>
            <th className="px-3 py-2 font-semibold text-slate-500">Date</th>
            <th className="px-3 py-2 font-semibold text-slate-500">Party</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50 cursor-pointer" onClick={() => onRowClick(r)}>
              <td className="px-3 py-1.5">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${SOURCE_COLORS[r.source] ?? ''}`}>{r.source}</span>
              </td>
              <td className="px-3 py-1.5 font-medium text-slate-800 whitespace-nowrap">{r.address || '—'}</td>
              <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{r.city || '—'}</td>
              <td className="px-3 py-1.5 text-right text-slate-600 whitespace-nowrap">{r.sf || '—'}</td>
              <td className="px-3 py-1.5 text-right font-semibold text-blue-600 whitespace-nowrap">{r.rate || '—'}</td>
              <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap">{r.type || '—'}</td>
              <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{r.date || '—'}</td>
              <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-[200px] truncate">{r.party || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Main Component ----

export function ListingsSearch({ onUseInCalculator }: { onUseInCalculator: (l: UnifiedListing) => void }) {
  const [query, setQuery] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ILS' | 'AIR'>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [allListings, setAllListings] = useState<UnifiedListing[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedListing | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Property lookup panel state
  const [lookupResults, setLookupResults] = useState<LookupResults | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupTab, setLookupTab] = useState('all');

  useEffect(() => {
    Promise.all([
      supabase.from('ils').select('city').neq('city', null),
      supabase.from('air_listings').select('city').neq('city', null),
    ]).then(([ils, air]) => {
      const all = [
        ...(ils.data ?? []).map((r: { city: string | null }) => r.city),
        ...(air.data ?? []).map((r: { city: string | null }) => r.city),
      ].filter(Boolean) as string[];
      setCities(Array.from(new Set(all)).sort());
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const db = supabase as any;

    const buildIlsQuery = () => {
      const t = query.trim();
      let q = db.from('ils').select('*').order('date', { ascending: false, nullsFirst: false }).limit(FETCH_LIMIT);
      if (cityFilter) q = q.eq('city', cityFilter);
      if (streetNumber) q = q.ilike('address', `${streetNumber}%`);
      if (streetName) q = q.ilike('address', `%${streetName}%`);
      if (!streetNumber && !streetName && t) q = q.or(`address.ilike.%${t}%,ils_number.ilike.%${t}%,company_agent.ilike.%${t}%,business_park.ilike.%${t}%`);
      return q;
    };

    const buildAirQuery = () => {
      const t = query.trim();
      let q = db.from('air_listings').select('*').order('date', { ascending: false, nullsFirst: false }).limit(FETCH_LIMIT);
      if (cityFilter) q = q.eq('city', cityFilter);
      if (streetNumber) q = q.ilike('address', `${streetNumber}%`);
      if (streetName) q = q.ilike('address', `%${streetName}%`);
      if (!streetNumber && !streetName && t) q = q.or(`address.ilike.%${t}%,listing_number.ilike.%${t}%,company_agent.ilike.%${t}%,business_park.ilike.%${t}%`);
      return q;
    };

    try {
      const [ilsResult, airResult] = await Promise.all([
        sourceFilter !== 'AIR' ? buildIlsQuery() : Promise.resolve({ data: [], error: null }),
        sourceFilter !== 'ILS' ? buildAirQuery() : Promise.resolve({ data: [], error: null }),
      ]);

      if (ilsResult.error) { setError(ilsResult.error.message); setLoading(false); return; }
      if (airResult.error) { setError(airResult.error.message); setLoading(false); return; }

      const merged: UnifiedListing[] = [
        ...(ilsResult.data ?? []).map((r: any) => normalizeIls(r)),
        ...(airResult.data ?? []).map((r: any) => normalizeAir(r)),
      ].sort(sortByDate);

      setAllListings(merged);
      // Update selected with fresh data if still selected
      if (selected) {
        const refreshed = merged.find(l => l.source === selected.source && l.report_id === selected.report_id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (e) {
      setError((e as Error).message);
    }

    setLoading(false);
  }, [query, streetNumber, streetName, sourceFilter, cityFilter]);

  useEffect(() => { setPage(1); }, [query, streetNumber, streetName, sourceFilter, cityFilter]);
  useEffect(() => { if (hasSearched) load(); }, [load, hasSearched]);

  const handleSearch = () => { setHasSearched(true); setPage(1); load(); };

  // Address-based property lookup across all tables
  const handleAddressLookup = useCallback(async () => {
    if (!streetNumber.trim() && !streetName.trim()) return;
    setLookupLoading(true);
    setLookupResults(null);
    setLookupTab('all');
    setLookupAddress([streetNumber, streetName].filter(Boolean).join(' '));
    const db = supabase as any;

    const q = (table: string, nameCol: string, useStNum: boolean) => {
      let qb = db.from(table).select('*').limit(50);
      if (streetName.trim()) qb = qb.ilike(nameCol, `%${streetName.trim()}%`);
      if (streetNumber.trim() && useStNum) {
        const sn = parseInt(streetNumber.trim(), 10);
        if (!isNaN(sn)) qb = qb.lte('st_num_low', sn).gte('st_num_high', sn);
      } else if (streetNumber.trim()) {
        qb = qb.ilike('address', `${streetNumber.trim()}%`);
      }
      return qb;
    };

    const [ih1, ih2, ils, ac, ap, al] = await Promise.allSettled([
      q('ihlease', 'streetname', true).order('transactiondate', { ascending: false }),
      q('ihsale',  'streetname', true).order('transactiondate', { ascending: false }),
      q('ils',     'street_name', true).order('date', { ascending: false }),
      db.from('aircomps').select('*').ilike('street_name', `%${streetName.trim()}%`).limit(50).order('lease_signed_date', { ascending: false }),
      q('air_properties', 'street_name', true).order('created_at', { ascending: false }),
      q('air_listings',   'street_name', true).order('date', { ascending: false }),
    ]);

    const ext = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value.data ? r.value.data : [];
    setLookupResults({ ihLease: ext(ih1), ihSale: ext(ih2), ils: ext(ils), airComps: ext(ac), airProps: ext(ap), airList: ext(al) });
    setLookupLoading(false);
  }, [streetNumber, streetName]);

  const clearAll = () => {
    setQuery(''); setStreetNumber(''); setStreetName('');
    setSourceFilter('all'); setCityFilter('');
    setAllListings([]); setSelected(null);
    setHasSearched(false); setPage(1);
    setLookupResults(null); setLookupAddress('');
  };

  const total = allListings.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const listings = allListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const inputCls = 'bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium outline-none transition-all';
  const btnBlue = 'px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap';
  const btnSlate = 'px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm whitespace-nowrap';

  // Lookup tab counts
  const lkCounts = lookupResults ? {
    all: lookupResults.ihLease.length + lookupResults.ihSale.length + lookupResults.ils.length + lookupResults.airComps.length + lookupResults.airProps.length + lookupResults.airList.length,
    ihLease: lookupResults.ihLease.length, ihSale: lookupResults.ihSale.length,
    ils: lookupResults.ils.length, airComps: lookupResults.airComps.length,
    airProps: lookupResults.airProps.length, airList: lookupResults.airList.length,
  } : null;

  const TABS = [
    { key: 'all', label: 'All' }, { key: 'ihLease', label: 'IH Lease' }, { key: 'ihSale', label: 'IH Sale' },
    { key: 'ils', label: 'ILS' }, { key: 'airComps', label: 'AIR Comps' },
    { key: 'airProps', label: 'AIR Props' }, { key: 'airList', label: 'AIR List' },
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Listing # quick search */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Listing #</label>
            <div className="flex gap-1.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={query}
                  onChange={(e) => { setQuery(e.target.value); setStreetNumber(''); setStreetName(''); setLookupResults(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="ILS / AIR / IH #"
                  className={`w-44 pl-8 ${inputCls}`} />
              </div>
              <button onClick={handleSearch} className={btnBlue}>Lookup</button>
            </div>
          </div>

          <div className="text-slate-300 self-center pb-1">|</div>

          {/* Address lookup → shows property lookup panel */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Address Search</label>
            <div className="flex gap-1.5">
              <input type="text" value={streetNumber}
                onChange={(e) => { setStreetNumber(e.target.value); setQuery(''); }}
                placeholder="500" className={`w-20 ${inputCls}`} />
              <input type="text" value={streetName}
                onChange={(e) => { setStreetName(e.target.value); setQuery(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddressLookup()}
                placeholder="Street Name" className={`w-44 ${inputCls}`} />
              <button onClick={handleAddressLookup} className={btnSlate}>Search</button>
            </div>
          </div>

          <div className="text-slate-300 self-center pb-1">|</div>

          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Source</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['all', 'ILS', 'AIR'] as const).map((s) => (
                <button key={s} onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${sourceFilter === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">City</label>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={`w-44 ${inputCls}`}>
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {(query || streetNumber || streetName || cityFilter || sourceFilter !== 'all' || lookupResults) && (
            <div className="flex-shrink-0 self-end">
              <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 border border-slate-200 rounded-lg bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                <X size={14} /> Clear
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Property Lookup Panel */}
      {(lookupLoading || lookupResults) && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b bg-slate-50">
            <div className="text-sm font-medium">
              Property Lookup: <span className="text-blue-600">{lookupAddress}</span>
              {lkCounts && <span className="text-slate-400 ml-2">— {lkCounts.all} record{lkCounts.all !== 1 ? 's' : ''} found</span>}
            </div>
            <button onClick={() => { setLookupResults(null); setLookupAddress(''); }} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700">
              <X size={15} />
            </button>
          </div>

          {lookupLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 size={16} className="animate-spin" /> Searching all databases...
            </div>
          ) : lookupResults && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-slate-100 overflow-x-auto">
                {TABS.map(({ key, label }) => {
                  const count = lkCounts ? lkCounts[key as keyof typeof lkCounts] : 0;
                  return (
                    <button key={key} onClick={() => setLookupTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-md whitespace-nowrap border-b-2 transition-colors ${lookupTab === key ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                      {label}
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-semibold ${count > 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Table */}
              <LookupTable
                rows={buildUnifiedRows(lookupResults)}
                activeTab={lookupTab}
                onRowClick={(row) => {
                  // For ILS/AIR List rows, convert to UnifiedListing and show PropertyBanner
                  if (row._src === 'ils') {
                    setSelected(normalizeIls(row._raw));
                  } else if (row._src === 'airList') {
                    setSelected(normalizeAir(row._raw));
                  }
                  // IH Lease/Sale/AIR Comps/Props don't map to UnifiedListing — just select nothing
                }}
              />
            </>
          )}
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          Error: {error}
        </div>
      )}

      {/* Property Banner */}
      {selected && (
        <PropertyBanner
          listing={selected}
          onDismiss={() => setSelected(null)}
          onUseInCalculator={onUseInCalculator}
        />
      )}

      {/* Results count — only shown for listing # search */}
      {!lookupResults && (
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-slate-500">
            {loading ? 'Loading...' : hasSearched ? `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}${total >= FETCH_LIMIT * (sourceFilter === 'all' ? 2 : 1) ? '+' : ''}` : ''}
          </span>
          {totalPages > 1 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Page {page} of {totalPages}
            </span>
          )}
        </div>
      )}

      {/* Table — hidden when lookup panel is active */}
      {!lookupResults && (<Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Src</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3 text-right">Bldg SF</th>
                <th className="px-4 py-3 text-right">Avail SF</th>
                <th className="px-4 py-3 text-right">Rate/SF</th>
                <th className="px-4 py-3 text-center">DH/GL</th>
                <th className="px-4 py-3 text-center">Clr Ht</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {error ? 'Could not load listings' : !hasSearched ? 'Enter a search above to find listings' : 'No listings found'}
                  </td>
                </tr>
              ) : (
                listings.map((l) => {
                  const isActive = selected?.source === l.source && selected?.report_id === l.report_id;
                  const photoUrl = l.photo_url;
                  const brochureUrl = l.marketing_flyer || l.pdf_url || l.property_link;
                  return (
                    <tr
                      key={`${l.source}-${l.report_id}`}
                      className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      onClick={() => setSelected(isActive ? null : l)}
                    >
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${l.source === 'AIR' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {l.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`font-medium ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>{l.street_address ?? '—'}</div>
                        {l.suite && <div className="text-xs text-slate-400">Ste {l.suite}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmt(l.city)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtNum(l.building_sqft)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtNum(l.available_sqft)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600">
                        {fmtRate(l.rate_per_sf)}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {fmt(l.dh_doors, '0')}/{fmt(l.gl_doors, '0')}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{fmt(l.clear_height)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmt(l.listing_date)}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {photoUrl ? (
                            <a href={photoUrl} target="_blank" rel="noopener noreferrer" title="View Photo"
                              className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors">
                              Photo
                            </a>
                          ) : <span className="text-xs text-slate-200">—</span>}
                          {brochureUrl ? (
                            <a href={brochureUrl} target="_blank" rel="noopener noreferrer" title="View Brochure"
                              className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors">
                              PDF
                            </a>
                          ) : <span className="text-xs text-slate-200">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>)}

      {/* Pagination */}
      {!lookupResults && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) pg = i + 1;
            else if (page <= 4) pg = i + 1;
            else if (page >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = page - 3 + i;
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${pg === page ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}>
                {pg}
              </button>
            );
          })}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
