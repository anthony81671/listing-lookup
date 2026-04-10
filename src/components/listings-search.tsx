'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedListing } from '@/types';
import { Search, X, ChevronLeft, ChevronRight, ExternalLink, Calculator } from 'lucide-react';

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
    rate_per_sf: (row.rate_sf as string) ?? null,
    rent_type: null,
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

// ---- Property Banner (matches LeaseAnalyzer inline property info) ----

function PropertyBanner({
  listing,
  onDismiss,
  onUseInCalculator,
}: {
  listing: UnifiedListing;
  onDismiss: () => void;
  onUseInCalculator: (l: UnifiedListing) => void;
}) {
  const brochureUrl = listing.marketing_flyer || listing.pdf_url;
  const col = (label: string, value: string) => (
    <td className="pr-5 py-0.5">
      <span className="text-slate-800 font-bold text-[12px]">{value}</span>
    </td>
  );
  const hdr = (label: string) => (
    <th className="text-left pr-5 pb-0.5 text-slate-400 font-semibold text-[11px]">{label}</th>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden text-sm">
      {/* Dark header */}
      <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          {listing.property_name && (
            <div className="font-bold text-base leading-tight">{listing.property_name}</div>
          )}
          <div className="text-slate-200">{listing.street_address}</div>
          <div className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
            {listing.city && <span>{listing.city}{listing.state ? `, ${listing.state}` : ''}</span>}
            {listing.listing_status && (
              <span className="bg-slate-600 px-1.5 py-0.5 rounded text-xs font-medium">{listing.listing_status}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {listing.photo_url && (
            <a href={listing.photo_url} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded transition-colors">
              Photo
            </a>
          )}
          {brochureUrl && (
            <a href={brochureUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded transition-colors">
              Brochure
            </a>
          )}
          {listing.property_link && (
            <a href={listing.property_link} target="_blank" rel="noopener noreferrer"
              className="text-xs bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded transition-colors flex items-center gap-1">
              <ExternalLink size={11} />Link
            </a>
          )}
          <button
            onClick={() => onUseInCalculator(listing)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Calculator size={13} />Use in Calculator
          </button>
          <button onClick={onDismiss} className="p-1 hover:bg-white/20 rounded transition-colors" title="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Property details table */}
      <div className="px-5 py-3 flex gap-5">
        <div className="flex-shrink-0">
          <table className="text-[12px] border-collapse">
            <thead>
              <tr>
                {hdr('Bldg SF')}{hdr('Rate/SF')}{hdr('Rent Type')}{hdr('DH/GL')}{hdr('Clear Ht')}{hdr('Status')}
              </tr>
            </thead>
            <tbody>
              <tr>
                {col('Bldg SF', fmtNum(listing.building_sqft))}
                {col('Rate/SF', listing.rate_per_sf ? `$${listing.rate_per_sf}` : '—')}
                {col('Rent Type', fmt(listing.rent_type))}
                {col('DH/GL', `${fmt(listing.dh_doors, '0')}/${fmt(listing.gl_doors, '0')}`)}
                {col('Clear Ht', fmt(listing.clear_height))}
                {col('Status', fmt(listing.listing_status))}
              </tr>
            </tbody>
            <thead>
              <tr>
                {hdr('Avail SF')}{hdr('Office SF')}{hdr('Amps')}{hdr('Parking')}{hdr('Yard')}{hdr('Rail')}
              </tr>
            </thead>
            <tbody>
              <tr>
                {col('Avail SF', fmtNum(listing.available_sqft))}
                {col('Office SF', fmtNum(listing.office_sqft))}
                {col('Amps', fmt(listing.amperage))}
                {col('Parking', fmt(listing.parking_spaces) !== '—' ? fmt(listing.parking_spaces) : fmt(listing.parking_ratio))}
                {col('Yard', fmt(listing.yard_space))}
                {col('Rail', fmt(listing.rail_access))}
              </tr>
            </tbody>
          </table>
          {listing.company_agent && (
            <div className="mt-2 pt-2 border-t border-slate-200 text-[12px] text-slate-700 font-medium whitespace-pre-line">
              {listing.company_agent}
            </div>
          )}
        </div>
        {(listing.highlights || listing.comments) && (
          <div className="flex-1 min-w-0 border-l border-slate-200 pl-5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Listing Notes</div>
            {listing.highlights && (
              <p className="text-slate-800 text-[12px] leading-relaxed whitespace-pre-line font-medium">{listing.highlights}</p>
            )}
            {listing.comments && (
              <p className="text-slate-600 text-[12px] leading-relaxed whitespace-pre-line mt-1">{listing.comments}</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold">
            {listing.source} {listing.listing_number ? `#${listing.listing_number}` : ''}
          </span>
          {(listing.market || listing.submarket) && (
            <span className="text-slate-400">{[listing.market, listing.submarket].filter(Boolean).join(' / ')}</span>
          )}
        </div>
        {listing.listing_date && <span>Listed: {listing.listing_date}</span>}
      </div>
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
  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setPage(1); load(); };

  const total = allListings.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const listings = allListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const inputCls = 'bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium outline-none transition-all';
  const btnBlue = 'px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap';
  const btnSlate = 'px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm whitespace-nowrap';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Quick Search</label>
            <div className="flex gap-1.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={query}
                  onChange={(e) => { setQuery(e.target.value); setStreetNumber(''); setStreetName(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Address, listing #, agent..."
                  className={`w-56 pl-8 ${inputCls}`} />
              </div>
              <button onClick={handleSearch} className={btnBlue}>Search</button>
              {query && (
                <button onClick={() => setQuery('')} className="px-2 py-2 text-slate-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="text-slate-300 self-center pb-1">|</div>

          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Address Search</label>
            <div className="flex gap-1.5">
              <input type="text" value={streetNumber}
                onChange={(e) => { setStreetNumber(e.target.value); setQuery(''); }}
                placeholder="St #" className={`w-20 ${inputCls}`} />
              <input type="text" value={streetName}
                onChange={(e) => { setStreetName(e.target.value); setQuery(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Street Name" className={`w-40 ${inputCls}`} />
              <button onClick={handleSearch} className={btnSlate}>Search</button>
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
        </div>
      </Card>

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

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-slate-500">
          {loading ? 'Loading...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}${total >= FETCH_LIMIT * (sourceFilter === 'all' ? 2 : 1) ? '+' : ''}`}
        </span>
        {totalPages > 1 && (
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Src</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 hidden sm:table-cell">City</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Bldg SF</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Avail SF</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Rate/SF</th>
                <th className="px-4 py-3 text-center hidden lg:table-cell">DH/GL</th>
                <th className="px-4 py-3 text-center hidden xl:table-cell">Clr Ht</th>
                <th className="px-4 py-3 hidden xl:table-cell">Date</th>
                <th className="px-4 py-3 text-center">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.length === 0 && !loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    {error ? 'Could not load listings' : 'No listings found'}
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
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{fmt(l.city)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{fmtNum(l.building_sqft)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 hidden md:table-cell">{fmtNum(l.available_sqft)}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 hidden lg:table-cell">
                        {l.rate_per_sf ? `$${l.rate_per_sf}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">
                        {fmt(l.dh_doors, '0')}/{fmt(l.gl_doors, '0')}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden xl:table-cell">{fmt(l.clear_height)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden xl:table-cell">{fmt(l.listing_date)}</td>
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
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
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
