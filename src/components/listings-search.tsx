'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedListing } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 25;

function fmt(val: string | null | undefined, suffix = '') {
  if (!val || val.trim() === '') return '—';
  return val + suffix;
}

function fmtNum(val: string | null | undefined) {
  if (!val || val.trim() === '') return '—';
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return val;
  return n.toLocaleString();
}

function ListingDetail({ listing }: { listing: UnifiedListing }) {
  const row = (label: string, value: string | null | undefined) => (
    <div key={label} className="flex gap-2 py-1 border-b border-slate-100 last:border-0">
      <span className="w-40 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 font-medium">{fmt(value)}</span>
    </div>
  );

  const address = [listing.street_address, listing.suite].filter(Boolean).join(', ');
  const cityStateZip = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Location</p>
        {row('Address', address || listing.street_address)}
        {row('City / State', cityStateZip)}
        {row('Market', listing.market)}
        {row('Submarket', listing.submarket)}
        {row('Property Name', listing.property_name)}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Listing</p>
        {row('Source', listing.source)}
        {row('Listing #', listing.listing_number)}
        {row('Date', listing.listing_date)}
        {row('Status', listing.listing_status)}
        {row('Company / Agent', listing.company_agent)}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Size</p>
        {row('Building SF', fmtNum(listing.building_sqft))}
        {row('Available SF', fmtNum(listing.available_sqft))}
        {row('Office SF', fmtNum(listing.office_sqft))}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Financials</p>
        {row('Rate / SF', listing.rate_per_sf ? `$${listing.rate_per_sf}` : null)}
        {row('Rent Type', listing.rent_type)}
        {row('Sale Price / SF', listing.sale_price_per_sf ? `$${listing.sale_price_per_sf}` : null)}
        {row('Total Sale Price', listing.total_sale_price)}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Building Features</p>
        {row('Clear Height', listing.clear_height)}
        {row('Dock-High Doors', listing.dh_doors)}
        {row('Grade-Level Doors', listing.gl_doors)}
        {row('Sprinklers', listing.sprinklers)}
        {row('Rail Access', listing.rail_access)}
        {row('Amperage', listing.amperage)}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Parking & Yard</p>
        {row('Parking Spaces', listing.parking_spaces)}
        {row('Parking Ratio', listing.parking_ratio)}
        {row('Yard Space', listing.yard_space)}
      </div>
      {(listing.highlights || listing.comments) && (
        <div className="mt-4 col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Notes</p>
          {listing.highlights && (
            <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">{listing.highlights}</p>
          )}
          {listing.comments && (
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{listing.comments}</p>
          )}
        </div>
      )}
      {(listing.property_link || listing.marketing_flyer || listing.pdf_url) && (
        <div className="mt-4 col-span-full flex gap-3">
          {listing.property_link && (
            <a href={listing.property_link} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Property Link
            </a>
          )}
          {listing.marketing_flyer && (
            <a href={listing.marketing_flyer} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> Marketing Flyer
            </a>
          )}
          {listing.pdf_url && (
            <a href={listing.pdf_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              <ExternalLink className="h-3.5 w-3.5" /> PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function ListingsSearch() {
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ILS' | 'AIR'>('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [listings, setListings] = useState<UnifiedListing[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UnifiedListing | null>(null);

  // Load city list once
  useEffect(() => {
    supabase
      .from('vw_unified_listing_report')
      .select('city')
      .neq('city', null)
      .then(({ data }) => {
        if (!data) return;
        const unique = Array.from(new Set(data.map(r => r.city).filter(Boolean) as string[])).sort();
        setCities(unique);
      });
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from('vw_unified_listing_report')
      .select('*', { count: 'exact' })
      .order('listing_date', { ascending: false })
      .range(from, to);

    if (sourceFilter !== 'all') q = q.eq('source', sourceFilter);
    if (cityFilter !== 'all') q = q.eq('city', cityFilter);
    if (query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(
        `street_address.ilike.${term},listing_number.ilike.${term},company_agent.ilike.${term},property_name.ilike.${term}`
      );
    }

    const { data, count, error } = await q;
    if (!error && data) {
      setListings(data as UnifiedListing[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [query, sourceFilter, cityFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter, cityFilter]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search address, listing #, agent..."
            className="pl-9"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <Select value={sourceFilter} onValueChange={v => setSourceFilter(v as 'all' | 'ILS' | 'AIR')}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="ILS">ILS</SelectItem>
            <SelectItem value="AIR">AIR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={(v) => setCityFilter(v ?? 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{loading ? 'Loading...' : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}`}</span>
        {totalPages > 1 && (
          <span>Page {page} of {totalPages}</span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-12">Src</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="hidden md:table-cell text-right">Bldg SF</TableHead>
              <TableHead className="hidden md:table-cell text-right">Avail SF</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Rate/SF</TableHead>
              <TableHead className="hidden lg:table-cell text-center">DH/GL</TableHead>
              <TableHead className="hidden xl:table-cell text-center">Clr Ht</TableHead>
              <TableHead className="hidden xl:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                  No listings found
                </TableCell>
              </TableRow>
            ) : (
              listings.map(l => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setSelected(l)}
                >
                  <TableCell>
                    <Badge variant={l.source === 'ILS' ? 'default' : 'secondary'} className="text-xs">
                      {l.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{l.street_address ?? '—'}</div>
                    {l.suite && <div className="text-xs text-slate-400">Ste {l.suite}</div>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-slate-600">{fmt(l.city)}</TableCell>
                  <TableCell className="hidden md:table-cell text-right text-slate-600">{fmtNum(l.building_sqft)}</TableCell>
                  <TableCell className="hidden md:table-cell text-right text-slate-600">{fmtNum(l.available_sqft)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-medium">
                    {l.rate_per_sf ? `$${l.rate_per_sf}` : '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center text-slate-600">
                    {[l.dh_doors, l.gl_doors].map(v => v ?? '—').join(' / ')}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-center text-slate-600">{fmt(l.clear_height)}</TableCell>
                  <TableCell className="hidden xl:table-cell text-slate-500 text-sm">{fmt(l.listing_date)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) pg = i + 1;
            else if (page <= 4) pg = i + 1;
            else if (page >= totalPages - 3) pg = totalPages - 6 + i;
            else pg = page - 3 + i;
            return (
              <Button
                key={pg}
                variant={pg === page ? 'default' : 'outline'}
                size="sm"
                className="w-9"
                onClick={() => setPage(pg)}
                disabled={loading}
              >
                {pg}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selected?.street_address ?? 'Listing Detail'}
              {selected?.city && <span className="font-normal text-slate-500 ml-2">— {selected.city}</span>}
            </DialogTitle>
          </DialogHeader>
          {selected && <ListingDetail listing={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
