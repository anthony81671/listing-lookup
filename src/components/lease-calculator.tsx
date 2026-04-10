'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculate } from '@/lib/calculator';
import type { CalcInputs, UnifiedListing } from '@/types';
import { Calculator, X, DollarSign, Calendar, Building2, Users } from 'lucide-react';
import { PropertyBanner } from '@/components/property-banner';

const DEFAULT_INPUTS: CalcInputs = {
  sqFt: '',
  rentPerSqFt: '',
  termInMonths: '',
  occupancyDate: '',
  freeRentMonths: '0',
  rentAdjustments: '3%',
  tiA: '0',
  rentType: 'NNN',
  daysOnMarket: '',
  landAcres: '',
  parkingRatio: '',
  parkingSpaces: '',
  officeSqFt: '',
  transactionDate: '',
  propertyType: 'Industrial',
  propertySubtype: '',
  buildingClass: '',
  floors: '',
  yearBuilt: '',
  clearHeight: '',
  dhDoors: '',
  glDoors: '',
  amperage: '',
  sprinklers: '',
  yard: '',
  rail: '',
  construction: '',
  multiTenant: '',
  pol: '',
  spaceType: '',
  brochureLink: '',
  transactionType: 'lease',
  lessor: '',
  lessee: '',
  seller: '',
  buyer: '',
  listCompany: '',
  listAgent1First: '',
  listAgent1Last: '',
  listAgent2First: '',
  listAgent2Last: '',
  procCompany: '',
  procAgent1First: '',
  procAgent1Last: '',
  procAgent2First: '',
  procAgent2Last: '',
};

// ---- Sub-components ----

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const InputGroup = ({
  label,
  icon: Icon,
  value,
  onChange,
  type = 'text',
  prefix,
  suffix,
  placeholder,
  onClear,
  readOnly = false,
}: {
  label?: string;
  icon?: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  onClear?: () => void;
  readOnly?: boolean;
}) => (
  <div className="space-y-1">
    {label && (
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
        {Icon && <Icon size={12} />}
        {label}
      </label>
    )}
    <div className="relative">
      {prefix && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none text-sm">
          {prefix}
        </div>
      )}
      <input
        type={type}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2 transition-all font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-calendar-picker-indicator]:hidden ${
          prefix ? 'pl-6' : ''
        } ${suffix || onClear ? 'pr-8' : ''} ${readOnly ? 'bg-slate-100 text-slate-500 cursor-default' : ''}`}
      />
      {suffix && !onClear && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none">
          {suffix}
        </div>
      )}
      {onClear && value && (
        <button
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
          title="Clear"
        >
          <X size={14} />
        </button>
      )}
    </div>
  </div>
);

const SelectGroup = ({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => (
  <div className="space-y-1">
    {label && (
      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
        {label}
      </label>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2 font-medium outline-none"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const SectionHeader = ({ icon: Icon, title }: { icon?: React.ElementType; title: string }) => (
  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 border-t border-slate-200 pt-3 first:border-0 first:pt-0">
    {Icon && <Icon size={13} />} {title}
  </h3>
);

const ResultCard = ({
  label,
  value,
  subtext,
  highlight = false,
}: {
  label: string;
  value: string;
  subtext?: string;
  highlight?: boolean;
}) => (
  <div className={`p-4 rounded-xl border ${highlight ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
    <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-2xl font-bold ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{value}</div>
    {subtext && <div className="text-slate-400 text-xs mt-1 font-medium">{subtext}</div>}
  </div>
);

// ---- Comp Summary Card (Metropolis-style dense grid) ----

function fmtDate(d: Date | null | undefined) {
  if (!d) return '—';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtMoney(n: number, decimals = 0) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function CompSummaryCard({
  inputs,
  result,
  prefill,
}: {
  inputs: CalcInputs;
  result: NonNullable<ReturnType<typeof calculate>>;
  prefill?: UnifiedListing | null;
}) {
  const { results, schedule } = result;
  const sqft = parseFloat(inputs.sqFt) || 0;
  const landSF = inputs.landAcres ? Math.round(parseFloat(inputs.landAcres) * 43560) : 0;
  const dom = inputs.daysOnMarket ? parseFloat(inputs.daysOnMarket) : 0;
  const expDate = fmtDate(results.expireDate);
  const occDate = inputs.occupancyDate ? fmtDate(new Date(inputs.occupancyDate)) : '—';
  const transDate = inputs.transactionDate ? fmtDate(new Date(inputs.transactionDate)) : '—';

  // Property detail helpers — prefer manual input, fall back to prefill
  const p = (inputVal: string, prefillVal: string | null | undefined) =>
    inputVal?.trim() || prefillVal?.trim() || '';
  const officeSF = inputs.officeSqFt
    ? Number(inputs.officeSqFt).toLocaleString()
    : prefill?.office_sqft
    ? Number(prefill.office_sqft.replace(/[^0-9.]/g, '')).toLocaleString()
    : '';
  const parking = inputs.parkingRatio || prefill?.parking_ratio || prefill?.parking_spaces || '';

  const yr = (n: number) => {
    const row = schedule[n - 1];
    return row ? `$${row.rate.toFixed(2)} ${inputs.rentType}` : '—';
  };

  const Field = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className="flex items-baseline gap-1 min-w-0">
      <span className="text-slate-500 text-[10px] font-semibold whitespace-nowrap shrink-0">{label}:</span>
      <span className={`text-[11px] truncate ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value || '—'}</span>
    </div>
  );

  const address = prefill
    ? [prefill.street_address, prefill.suite, prefill.city, prefill.state].filter(Boolean).join(', ')
    : inputs.sqFt
    ? `${Number(inputs.sqFt).toLocaleString()} SF property`
    : 'Lease Comp Summary';

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 text-white px-4 py-2 text-xs font-mono flex items-center justify-between">
        <span className="font-bold">{address}</span>
        <span className="text-slate-300">{inputs.rentType}</span>
      </div>

      {/* Main grid — 6 column pairs */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-1 font-mono text-[11px]">
        {/* Col 1 — Financials */}
        <div className="space-y-0.5">
          <Field label="Leased SqFt" value={sqft > 0 ? sqft.toLocaleString() : ''} bold />
          <Field label="Rent/SqFt" value={inputs.rentPerSqFt ? `$${inputs.rentPerSqFt} ${inputs.rentType}` : ''} bold />
          <Field label="Free Rent" value={inputs.freeRentMonths !== '0' && inputs.freeRentMonths ? `${inputs.freeRentMonths} Mo` : '0'} />
          <Field label="Effect Rent" value={results.effectiveRate > 0 ? `$${results.effectiveRate.toFixed(2)}` : ''} bold />
          <Field label="Consid." value={results.totalConsideration > 0 ? fmtMoney(results.totalConsideration) : ''} />
          <Field label="Prop Type" value="Industrial" />
          <Field label="Sub-Type" value="Light Industrial" />
          <Field label="Bldg Class" value="" />
          <Field label="Space Type" value="" />
        </div>

        {/* Col 2 — Dates & Terms */}
        <div className="space-y-0.5">
          <Field label="Trans Date" value={transDate} />
          <Field label="Occ Date" value={occDate} />
          <Field label="Term" value={inputs.termInMonths ? `${inputs.termInMonths} Mo` : ''} />
          <Field label="Exp Date" value={expDate} />
          <Field label="On Market" value={dom > 0 ? `${dom} Days` : ''} />
          <Field label="Ask Rent" value={inputs.rentPerSqFt ? `$${inputs.rentPerSqFt} ${inputs.rentType}` : ''} />
          <Field label="Multi-Ten" value="" />
          <Field label="POL" value="" />
          <Field label="Yr Built" value="" />
        </div>

        {/* Col 3 — Rent Schedule */}
        <div className="space-y-0.5">
          <Field label="Rent Yr1" value={yr(1)} />
          <Field label="Rent Yr2" value={yr(2)} />
          <Field label="Rent Yr3" value={yr(3)} />
          <Field label="Rent Yr4" value={yr(4)} />
          <Field label="Rent Yr5" value={yr(5)} />
          <Field label="Rent Yr6" value={yr(6)} />
          <Field label="Rent Yr7" value={yr(7)} />
          <Field label="Rent Adj" value={inputs.rentAdjustments} />
        </div>

        {/* Col 4 — Property Specs */}
        <div className="space-y-0.5">
          <Field label="DH Door" value={p('', prefill?.dh_doors)} />
          <Field label="GL Door" value={p('', prefill?.gl_doors)} />
          <Field label="Height" value={p('', prefill?.clear_height)} />
          <Field label="Amps" value={p('', prefill?.amperage)} />
          <Field label="Parking" value={parking} />
          <Field label="Load" value="" />
          <Field label="Sprink" value={p('', prefill?.sprinklers)} />
          <Field label="TI" value={inputs.tiA && inputs.tiA !== '0' ? fmtMoney(parseFloat(inputs.tiA)) : '$0.00'} />
          <Field label="Options" value="" />
        </div>

        {/* Col 5 — Building Details */}
        <div className="space-y-0.5">
          <Field label="Bldg SqFt" value={prefill?.building_sqft ? Number(prefill.building_sqft.replace(/[^0-9.]/g, '')).toLocaleString() : ''} />
          <Field label="Land SqFt" value={landSF > 0 ? landSF.toLocaleString() : ''} />
          <Field label="Office SqFt" value={officeSF} />
          <Field label="Updated" value="" />
          <Field label="APN" value="" />
          <Field label="Source" value={prefill?.source ?? ''} />
          <Field label="Rail" value={p('', prefill?.rail_access)} />
          <Field label="Yard" value={p('', prefill?.yard_space)} />
          <Field label="Cons Type" value="" />
        </div>

        {/* Col 6 — IDs */}
        <div className="space-y-0.5">
          <Field label="ID" value={prefill?.listing_number ?? ''} />
          <Field label="Office SF" value={officeSF} />
          <Field label="Updated" value="" />
          <Field label="Update By" value="" />
          <Field label="TI/SF" value={results.tiPerSqFt > 0 ? `$${results.tiPerSqFt.toFixed(2)}` : '$0.00'} />
        </div>
      </div>

      {/* Broker/Party section */}
      <div className="border-t border-slate-200 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1 font-mono text-[11px]">
        <div className="space-y-0.5">
          <Field label={inputs.transactionType === 'sale' ? 'Buyer' : 'Lessee'} value={inputs.transactionType === 'sale' ? inputs.buyer : inputs.lessee} />
          <Field label="Proc Firm" value={inputs.procCompany} />
          <Field label="Proc Agent" value={[inputs.procAgent1First, inputs.procAgent1Last].filter(Boolean).join(' ')} />
          {(inputs.procAgent2First || inputs.procAgent2Last) && (
            <Field label="Proc Agent 2" value={[inputs.procAgent2First, inputs.procAgent2Last].filter(Boolean).join(' ')} />
          )}
        </div>
        <div className="space-y-0.5">
          <Field label={inputs.transactionType === 'sale' ? 'Seller' : 'Lessor'} value={inputs.transactionType === 'sale' ? inputs.seller : inputs.lessor} />
          <Field label="List Firm" value={inputs.listCompany || (prefill?.company_agent ?? '')} />
          <Field label="List Agent" value={[inputs.listAgent1First, inputs.listAgent1Last].filter(Boolean).join(' ')} />
          {(inputs.listAgent2First || inputs.listAgent2Last) && (
            <Field label="List Agent 2" value={[inputs.listAgent2First, inputs.listAgent2Last].filter(Boolean).join(' ')} />
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="border-t border-slate-200 px-4 py-2 font-mono text-[11px]">
        <Field label="Comments" value={prefill?.comments ?? prefill?.highlights ?? ''} />
      </div>
    </Card>
  );
}

// ---- Main Component ----

export function LeaseCalculator({
  prefill,
  onClearPrefill,
}: {
  prefill?: UnifiedListing | null;
  onClearPrefill?: () => void;
}) {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

  useEffect(() => {
    if (!prefill) return;
    const sqFt = prefill.available_sqft || prefill.building_sqft || '';
    const rate = (prefill.rate_per_sf ?? '').replace(/[^0-9.]/g, '');
    const rentType = prefill.rent_type || 'NNN';
    setInputs((prev) => ({
      ...prev,
      sqFt: sqFt.replace(/[^0-9.]/g, ''),
      rentPerSqFt: rate,
      rentType,
      officeSqFt: (prefill.office_sqft ?? '').replace(/[^0-9.]/g, ''),
      parkingRatio: prefill.parking_ratio ?? prev.parkingRatio,
      parkingSpaces: prefill.parking_spaces ?? prev.parkingSpaces,
      clearHeight: prefill.clear_height ?? prev.clearHeight,
      dhDoors: prefill.dh_doors ?? prev.dhDoors,
      glDoors: prefill.gl_doors ?? prev.glDoors,
      amperage: prefill.amperage ?? prev.amperage,
      sprinklers: prefill.sprinklers ?? prev.sprinklers,
      yard: prefill.yard_space ?? prev.yard,
      rail: prefill.rail_access ?? prev.rail,
    }));
  }, [prefill]);

  const set = (key: keyof CalcInputs) => (val: string) =>
    setInputs((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calculate(inputs), [inputs]);

  const handleClear = () => {
    setInputs(DEFAULT_INPUTS);
    onClearPrefill?.();
  };

  const rateDecimals = (() => {
    const r = inputs.rentPerSqFt.replace(/[^0-9.]/g, '');
    if (!r) return 2;
    const dotIndex = r.indexOf('.');
    if (dotIndex === -1) return 2;
    return Math.max(2, r.length - dotIndex - 1);
  })();

  // Derived values
  const monthsOnMarket = inputs.daysOnMarket ? Math.round(parseFloat(inputs.daysOnMarket) / 30) : null;
  const landSF = inputs.landAcres ? Math.round(parseFloat(inputs.landAcres) * 43560) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lease Calculator</h1>
          <p className="text-sm text-slate-500 mt-0.5">Enter lease terms to calculate effective rent and rent schedule</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 text-sm font-medium transition-colors text-slate-600"
        >
          <X size={16} />Clear
        </button>
      </div>

      {/* Prefill Banner */}
      {prefill && (
        <PropertyBanner
          listing={prefill}
          onDismiss={() => onClearPrefill?.()}
        />
      )}

      {/* Parameters Card */}
      <Card className="p-5">
        <div className="space-y-4">
          {/* Financials */}
          <div>
            <SectionHeader icon={DollarSign} title="Lease Financials" />
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <SelectGroup
                  label="Space Type"
                  value={inputs.spaceType}
                  onChange={set('spaceType')}
                  options={['', 'New Lease', 'Renewal', 'Sublease', 'Expansion', 'Renewal Expansion', 'Owner-User', 'Built-to-Suit']}
                />
                <InputGroup
                  label="Leased SF"
                  value={inputs.sqFt}
                  onChange={set('sqFt')}
                  placeholder="e.g. 50000"
                />
                <InputGroup
                  label="Rate / SF / Mo"
                  value={inputs.rentPerSqFt}
                  onChange={set('rentPerSqFt')}
                  placeholder="e.g. 1.25"
                  prefix="$"
                />
                <SelectGroup
                  label="Rent Type"
                  value={inputs.rentType}
                  onChange={set('rentType')}
                  options={['NNN', 'MG', 'G', 'IG', 'FSG']}
                />
                <InputGroup
                  label="Term (Months)"
                  value={inputs.termInMonths}
                  onChange={set('termInMonths')}
                  placeholder="e.g. 60"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InputGroup
                  label="Free Rent (Months)"
                  value={inputs.freeRentMonths}
                  onChange={set('freeRentMonths')}
                  placeholder="0"
                  onClear={() => set('freeRentMonths')('0')}
                />
                <InputGroup
                  label="Annual Escalation"
                  value={inputs.rentAdjustments}
                  onChange={set('rentAdjustments')}
                  placeholder="3% or $0.05"
                />
                <InputGroup
                  label="TI's Amount ($)"
                  value={inputs.tiA}
                  onChange={set('tiA')}
                  placeholder="0"
                  prefix="$"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InputGroup
                  label="Days on Market"
                  value={inputs.daysOnMarket}
                  onChange={set('daysOnMarket')}
                  placeholder="e.g. 180"
                />
                <InputGroup
                  label="Land Acres"
                  value={inputs.landAcres}
                  onChange={set('landAcres')}
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <SectionHeader icon={Calendar} title="Dates" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <InputGroup
                label="Transaction Date"
                type="date"
                value={inputs.transactionDate}
                onChange={set('transactionDate')}
              />
              <InputGroup
                label="Occupancy Date"
                type="date"
                value={inputs.occupancyDate}
                onChange={set('occupancyDate')}
              />
              <InputGroup
                label="Expiration Date"
                value={result?.results.expireDate
                  ? `${String(result.results.expireDate.getMonth() + 1).padStart(2, '0')}-${String(result.results.expireDate.getDate()).padStart(2, '0')}-${result.results.expireDate.getFullYear()}`
                  : ''}
                onChange={() => {}}
                readOnly
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Property Details Card */}
      <Card className="p-5">
        <div className="space-y-3">
          <SectionHeader icon={Building2} title="Property Details" />

          {/* Row 1 — Type / Subtype / Class / Floors / Year Built */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <SelectGroup
              label="Property Type"
              value={inputs.propertyType}
              onChange={set('propertyType')}
              options={['Industrial', 'Office', 'Retail', 'Flex', 'Land']}
            />
            <SelectGroup
              label="Subtype"
              value={inputs.propertySubtype}
              onChange={set('propertySubtype')}
              options={['', 'Warehouse', 'Distribution', 'Manufacturing', 'R&D', 'Flex', 'Cold Storage', 'Yard']}
            />
            <SelectGroup
              label="Building Class"
              value={inputs.buildingClass}
              onChange={set('buildingClass')}
              options={['', 'A', 'B', 'C']}
            />
            <InputGroup
              label="Floors"
              value={inputs.floors}
              onChange={set('floors')}
              placeholder="e.g. 2"
            />
            <InputGroup
              label="Year Built"
              value={inputs.yearBuilt}
              onChange={set('yearBuilt')}
              placeholder="e.g. 2000"
            />
          </div>

          {/* Row 2 — Office SF / Clear Height / DH Doors / GL Doors / Amps */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <InputGroup
              label="Office SF"
              value={inputs.officeSqFt}
              onChange={set('officeSqFt')}
              placeholder="e.g. 800"
            />
            <InputGroup
              label="Clear Height"
              value={inputs.clearHeight}
              onChange={set('clearHeight')}
              placeholder="e.g. 28"
              suffix="ft"
            />
            <InputGroup
              label="DH Doors"
              value={inputs.dhDoors}
              onChange={set('dhDoors')}
              placeholder="e.g. 4"
            />
            <InputGroup
              label="GL Doors"
              value={inputs.glDoors}
              onChange={set('glDoors')}
              placeholder="e.g. 1"
            />
            <InputGroup
              label="Amps"
              value={inputs.amperage}
              onChange={set('amperage')}
              placeholder="e.g. 2000"
            />
          </div>

          {/* Row 3 — Sprinklers / Parking Ratio / Parking Spaces / Yard / Rail */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <SelectGroup
              label="Sprinklers"
              value={inputs.sprinklers}
              onChange={set('sprinklers')}
              options={['', 'Y', 'N', 'ESFR', 'Wet', 'Dry']}
            />
            <InputGroup
              label="Parking Ratio"
              value={inputs.parkingRatio}
              onChange={set('parkingRatio')}
              placeholder="e.g. 2.5:1"
            />
            <InputGroup
              label="Parking Spaces"
              value={inputs.parkingSpaces}
              onChange={set('parkingSpaces')}
              placeholder="e.g. 50"
            />
            <SelectGroup
              label="Yard"
              value={inputs.yard}
              onChange={set('yard')}
              options={['', 'Y', 'N']}
            />
            <SelectGroup
              label="Rail"
              value={inputs.rail}
              onChange={set('rail')}
              options={['', 'Y', 'N']}
            />
          </div>

          {/* Row 4 — Construction / Multi-Tenant / POL / Brochure Link */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <SelectGroup
              label="Construction"
              value={inputs.construction}
              onChange={set('construction')}
              options={['', 'Concrete Tilt-Up', 'Masonry', 'Steel', 'Wood Frame', 'Precast']}
            />
            <SelectGroup
              label="Multi-Tenant"
              value={inputs.multiTenant}
              onChange={set('multiTenant')}
              options={['', 'Y', 'N']}
            />
            <SelectGroup
              label="POL"
              value={inputs.pol}
              onChange={set('pol')}
              options={['', 'Y', 'N']}
            />
            <div className="md:col-span-2">
              <InputGroup
                label="Brochure Link"
                value={inputs.brochureLink}
                onChange={set('brochureLink')}
                placeholder="URL"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Parties Card */}
      <Card className="p-5">
        <div className="space-y-4">
          {/* Transaction type toggle */}
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} /> Parties
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-0.5 ml-auto">
              <button
                onClick={() => set('transactionType')('lease')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${inputs.transactionType === 'lease' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Lease
              </button>
              <button
                onClick={() => set('transactionType')('sale')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${inputs.transactionType === 'sale' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Sale
              </button>
            </div>
          </div>

          {/* Principal parties */}
          <div className="grid grid-cols-2 gap-2">
            <InputGroup
              label={inputs.transactionType === 'lease' ? 'Lessor' : 'Seller'}
              value={inputs.transactionType === 'lease' ? inputs.lessor : inputs.seller}
              onChange={set(inputs.transactionType === 'lease' ? 'lessor' : 'seller')}
              placeholder={inputs.transactionType === 'lease' ? 'Landlord name' : 'Seller name'}
            />
            <InputGroup
              label={inputs.transactionType === 'lease' ? 'Lessee' : 'Buyer'}
              value={inputs.transactionType === 'lease' ? inputs.lessee : inputs.buyer}
              onChange={set(inputs.transactionType === 'lease' ? 'lessee' : 'buyer')}
              placeholder={inputs.transactionType === 'lease' ? 'Tenant name' : 'Buyer name'}
            />
          </div>

          {/* Listing broker */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 border-t border-slate-200 pt-3">
              Listing Broker
            </div>
            <div className="space-y-2">
              <InputGroup
                label="Company"
                value={inputs.listCompany}
                onChange={set('listCompany')}
                placeholder="Brokerage firm"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InputGroup
                  label="Agent 1 First"
                  value={inputs.listAgent1First}
                  onChange={set('listAgent1First')}
                  placeholder="First name"
                />
                <InputGroup
                  label="Agent 1 Last"
                  value={inputs.listAgent1Last}
                  onChange={set('listAgent1Last')}
                  placeholder="Last name"
                />
                <InputGroup
                  label="Agent 2 First"
                  value={inputs.listAgent2First}
                  onChange={set('listAgent2First')}
                  placeholder="First name"
                />
                <InputGroup
                  label="Agent 2 Last"
                  value={inputs.listAgent2Last}
                  onChange={set('listAgent2Last')}
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>

          {/* Procuring broker */}
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 border-t border-slate-200 pt-3">
              Procuring Broker
            </div>
            <div className="space-y-2">
              <InputGroup
                label="Company"
                value={inputs.procCompany}
                onChange={set('procCompany')}
                placeholder="Brokerage firm"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InputGroup
                  label="Agent 1 First"
                  value={inputs.procAgent1First}
                  onChange={set('procAgent1First')}
                  placeholder="First name"
                />
                <InputGroup
                  label="Agent 1 Last"
                  value={inputs.procAgent1Last}
                  onChange={set('procAgent1Last')}
                  placeholder="Last name"
                />
                <InputGroup
                  label="Agent 2 First"
                  value={inputs.procAgent2First}
                  onChange={set('procAgent2First')}
                  placeholder="First name"
                />
                <InputGroup
                  label="Agent 2 Last"
                  value={inputs.procAgent2Last}
                  onChange={set('procAgent2Last')}
                  placeholder="Last name"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      {result ? (
        <div className="space-y-6">
          {/* Primary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Effective Rate"
              value={`$${result.results.effectiveRate.toFixed(rateDecimals)}`}
              subtext="Per SF / Month"
              highlight
            />
            <ResultCard
              label="Average Rate"
              value={`$${result.results.averageRate.toFixed(rateDecimals)}`}
              subtext="Per SF / Month"
            />
            <ResultCard
              label="Total Consideration"
              value={`$${result.results.totalConsideration.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtext="Gross Rent"
            />
            <ResultCard
              label="TI's (SF)"
              value={result.results.tiPerSqFt > 0 ? `$${result.results.tiPerSqFt.toFixed(2)}` : '—'}
              subtext="Tenant Improvement / SF"
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Months on Market"
              value={monthsOnMarket !== null ? String(monthsOnMarket) : '—'}
              subtext={inputs.daysOnMarket ? `${inputs.daysOnMarket} Days` : 'Days on Market / 30'}
            />
            <ResultCard
              label="Free Rent Value"
              value={`$${result.results.freeRentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtext="Concession"
            />
            <ResultCard
              label="Land SF"
              value={landSF !== null ? landSF.toLocaleString() : '—'}
              subtext={inputs.landAcres ? `${inputs.landAcres} Acres` : 'Land Acres × 43,560'}
            />
            <ResultCard
              label="Expiration"
              value={result.results.expireDate
                ? `${String(result.results.expireDate.getMonth() + 1).padStart(2, '0')}-${String(result.results.expireDate.getDate()).padStart(2, '0')}-${result.results.expireDate.getFullYear()}`
                : '—'}
              subtext="Lease End Date"
            />
          </div>

          {/* Rent Schedule */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-700">Rent Schedule</h3>
              <span className="text-xs font-mono text-slate-500">
                {inputs.rentType && `${inputs.rentType} — `}
                {inputs.sqFt ? `${Number(inputs.sqFt).toLocaleString()} SF` : ''}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Year</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Months</th>
                    <th className="px-4 py-3">Monthly Rent</th>
                    <th className="px-4 py-3 text-right">Period Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.schedule.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.year}</td>
                      <td className="px-4 py-3 text-blue-600 font-bold">${row.rate.toFixed(rateDecimals)}</td>
                      <td className="px-4 py-3">{row.months}</td>
                      <td className="px-4 py-3">${row.monthlyRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-medium">${row.periodTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Comp Summary Card */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Calculator size={13} /> Comp Summary
            </h3>
            <CompSummaryCard inputs={inputs} result={result} prefill={prefill} />
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-300 rounded-xl">
          <div className="text-center">
            <Calculator size={48} className="mx-auto mb-4 opacity-50" />
            <p>Enter size, rate, term, and occupancy date to calculate</p>
          </div>
        </div>
      )}
    </div>
  );
}
