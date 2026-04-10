'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedListing } from '@/types';
import { Search, X, ChevronLeft, ChevronRight, ExternalLink, Building2, MessageSquareQuote } from 'lucide-react';

const PAGE_SIZE = 25;

function fmt(val: string | null | undefined, fallback = '—') {
  if (!val || val.trim() === '') return fallback;
  return val;
}

function fmtNum(val: string | null | undefined) {
  if (!val || val.trim() === '') return '—';
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return val;
  return n.toLocaleString();
}

// ---- Sub-components (match LeaseAnalyzer style exactly) ----

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const DetailItem = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`p-3 rounded-lg ${highlight ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
    <div className="text-xs font-bold text-slate-500 uppercase mb-1">{label}</div>
    <div className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</div>
  </div>
);

// ---- Building Detail Modal (matches BuildingInfoModal) ----
const ListingModal = ({ listing, onClose }: { listing: UnifiedListing; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
          <div className="pr-12">
            {listing.property_name && (
              <h2 className="text-2xl font-bold mb-1">{listing.property_name}</h2>
            )}
            <p className="text-blue-100 text-lg font-medium">{listing.street_address}</p>
            <p className="text-blue-200 text-sm mt-1">
              {[listing.city, listing.state].filter(Boolean).join(', ')}
            </p>
            {listing.listing_status && (
              <div className="mt-3 inline-block">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-400 text-blue-900">
                  {listing.listing_status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Property Details */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              Property Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Bldg SF" value={fmtNum(listing.building_sqft)} />
              <DetailItem label="Available SF" value={fmtNum(listing.available_sqft)} />
              <DetailItem label="Office SF" value={fmtNum(listing.office_sqft)} />
              <DetailItem label="Rate / SF" value={listing.rate_per_sf ? `$${listing.rate_per_sf}` : '—'} highlight />
              <DetailItem label="Rent Type" value={fmt(listing.rent_type)} />
              <DetailItem label="Sale / SF" value={listing.sale_price_per_sf ? `$${listing.sale_price_per_sf}` : '—'} />
              <DetailItem label="DH / GL Doors" value={`${fmt(listing.dh_doors, '0')} / ${fmt(listing.gl_doors, '0')}`} />
              <DetailItem label="Clear Height" value={fmt(listing.clear_height)} />
              <DetailItem label="Amps" value={fmt(listing.amperage)} />
              <DetailItem label="Sprinklers" value={fmt(listing.sprinklers)} />
              <DetailItem label="Rail Access" value={fmt(listing.rail_access)} />
              <DetailItem label="Yard" value={fmt(listing.yard_space)} />
              <DetailItem label="Parking Spaces" value={fmt(listing.parking_spaces)} />
              <DetailItem label="Parking Ratio" value={fmt(listing.parking_ratio)} />
              <DetailItem label="Source / Listing #" value={`${listing.source} ${listing.listing_number ? `#${listing.listing_number}` : ''}`.trim()} highlight />
            </div>
          </div>

          {/* Notes */}
          {(listing.highlights || listing.comments) && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                <MessageSquareQuote size={20} className="text-blue-600" />
                Notes
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                {listing.highlights && <p className="text-slate-800 text-sm font-medium whitespace-pre-wrap">{listing.highlights}</p>}
                {listing.comments && <p className="text-slate-600 text-sm whitespace-pre-wrap">{listing.comments}</p>}
              </div>
            </div>
          )}

          {/* Agent */}
          {listing.company_agent && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Agent Information</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="text-slate-700 text-sm whitespace-pre-line">{listing.company_agent}</p>
              </div>
            </div>
          )}

          {/* Links */}
          {(listing.property_link || listing.marketing_flyer || listing.pdf_url) && (
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              {listing.property_link && (
                <a
                  href={listing.property_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  <ExternalLink size={16} />Property Link
                </a>
              )}
              {listing.marketing_flyer && (
                <a
                  href={listing.marketing_flyer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  <ExternalLink size={16} />Marketing Flyer
                </a>
              )}
              {listing.pdf_url && (
                <a
                  href={listing.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
                >
                  <ExternalLink size={16} />PDF Brochure
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----

export function ListingsSearch() {
  const [query, setQuery] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [streetName, setStreetName] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ILS' | 'AIR'>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [listings, setListings] = useState<UnifiedListing[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UnifiedListing | null>(null);

  // vw_unified_listing_report is a view not in generated types — cast to bypass
  const db = supabase as any;

  // Load city list once
  useEffect(() => {
    db
      .from('vw_unified_listing_report')
      .select('city')
      .neq('city', null)
      .then(({ data }: { data: { city: string | null }[] | null }) => {
        if (!data) return;
        const unique = Array.from(new Set(data.map((r) => r.city).filter(Boolean) as string[])).sort();
        setCities(unique);
      });
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = db
      .from('vw_unified_listing_report')
      .select('*', { count: 'exact' })
      .order('listing_date', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (sourceFilter !== 'all') q = q.eq('source', sourceFilter);
    if (cityFilter) q = q.eq('city', cityFilter);

    if (streetNumber || streetName) {
      if (streetNumber) q = q.ilike('street_address', `${streetNumber}%`);
      if (streetName) q = q.ilike('street_address', `%${streetName}%`);
    } else if (query.trim()) {
      const t = query.trim();
      q = q.or(
        `street_address.ilike.%${t}%,listing_number.ilike.%${t}%,company_agent.ilike.%${t}%,property_name.ilike.%${t}%`
      );
    }

    const { data, count, error: qErr } = await q;
    if (qErr) {
      setError(qErr.message);
      setListings([]);
      setTotal(0);
    } else if (data) {
      setListings(data as UnifiedListing[]);
      setTotal(count ?? data.length);
    }
    setLoading(false);
  }, [query, streetNumber, streetName, sourceFilter, cityFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, streetNumber, streetName, sourceFilter, cityFilter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const handleSearch = () => load(1);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const inputCls = 'bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium outline-none transition-all';
  const btnBlue = 'px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm whitespace-nowrap';
  const btnSlate = 'px-3 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm whitespace-nowrap';

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <Card className="px-4 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* General Search */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Quick Search</label>
            <div className="flex gap-1.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setStreetNumber(''); setStreetName(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Address, listing #, agent..."
                  className={`w-56 pl-8 ${inputCls}`}
                />
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

          {/* Address Search */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Address Search</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={streetNumber}
                onChange={(e) => { setStreetNumber(e.target.value); setQuery(''); }}
                placeholder="St #"
                className={`w-20 ${inputCls}`}
              />
              <input
                type="text"
                value={streetName}
                onChange={(e) => { setStreetName(e.target.value); setQuery(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Street Name"
                className={`w-40 ${inputCls}`}
              />
              <button onClick={handleSearch} className={btnSlate}>Search</button>
            </div>
          </div>

          <div className="text-slate-300 self-center pb-1">|</div>

          {/* Filters */}
          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Source</label>
            <div className="flex bg-slate-100 rounded-lg p-1">
              {(['all', 'ILS', 'AIR'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${sourceFilter === s ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className={`w-44 ${inputCls}`}
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
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

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-slate-500">
          {loading ? 'Loading...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}`}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No listings found
                  </td>
                </tr>
              ) : (
                listings.map((l) => (
                  <tr
                    key={l.report_id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(l)}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${l.source === 'AIR' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {l.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{l.street_address ?? '—'}</div>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) pg = i + 1;
            else if (page <= 4) pg = i + 1;
            else if (page >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = page - 3 + i;
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                disabled={loading}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${pg === page ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
              >
                {pg}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selected && <ListingModal listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
