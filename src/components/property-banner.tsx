'use client';

import { X, ExternalLink, Calculator } from 'lucide-react';
import type { UnifiedListing } from '@/types';

function fmt(val: string | null | undefined, fallback = '—') {
  return val?.trim() || fallback;
}

function fmtNum(val: string | null | undefined) {
  if (!val?.trim()) return '—';
  const n = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? val : n.toLocaleString();
}

function fmtRate(val: string | null | undefined) {
  if (!val?.trim()) return '—';
  if (val.startsWith('$') || isNaN(parseFloat(val))) return val;
  return `$${val}`;
}

export function PropertyBanner({
  listing,
  onDismiss,
  onUseInCalculator,
}: {
  listing: UnifiedListing;
  onDismiss: () => void;
  onUseInCalculator?: (l: UnifiedListing) => void;
}) {
  const brochureUrl = listing.marketing_flyer || listing.pdf_url;

  const col = (_label: string, value: string) => (
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
          {onUseInCalculator && (
            <button
              onClick={() => onUseInCalculator(listing)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Calculator size={13} />Use in Calculator
            </button>
          )}
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
                {col('Rate/SF', fmtRate(listing.rate_per_sf))}
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
