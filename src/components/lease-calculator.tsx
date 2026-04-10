'use client';

import { useState, useMemo, useEffect } from 'react';
import { calculate } from '@/lib/calculator';
import type { CalcInputs, UnifiedListing } from '@/types';
import { Calculator, X, DollarSign, Calendar, Building2 } from 'lucide-react';

const DEFAULT_INPUTS: CalcInputs = {
  sqFt: '',
  rentPerSqFt: '',
  termInMonths: '',
  occupancyDate: '',
  freeRentMonths: '0',
  rentAdjustments: '3%',
  tiA: '0',
  rentType: 'NNN',
};

// ---- Sub-components (match LeaseAnalyzer exactly) ----

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

// ---- Main Component ----

export function LeaseCalculator({
  prefill,
  onClearPrefill,
}: {
  prefill?: UnifiedListing | null;
  onClearPrefill?: () => void;
}) {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

  // Apply prefill whenever a listing is sent from the search tab
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
    if (!inputs.rentPerSqFt) return 2;
    const dotIndex = inputs.rentPerSqFt.indexOf('.');
    if (dotIndex === -1) return 2;
    return Math.max(2, inputs.rentPerSqFt.length - dotIndex - 1);
  })();

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
        <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
          <Building2 size={15} className="text-green-600 flex-shrink-0" />
          <span className="text-green-800 font-medium flex-1">
            Pre-filled from: <span className="font-bold">{prefill.street_address}</span>
            {prefill.city ? `, ${prefill.city}` : ''}
            {prefill.available_sqft ? ` — ${Number(prefill.available_sqft.replace(/[^0-9.]/g, '')).toLocaleString()} SF` : ''}
            {prefill.rate_per_sf ? ` @ $${prefill.rate_per_sf}/SF` : ''}
          </span>
          <button onClick={onClearPrefill} className="text-green-600 hover:text-green-800 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Parameters Card */}
      <Card className="p-5">
        <div className="space-y-4">
          {/* Financials */}
          <div>
            <SectionHeader icon={DollarSign} title="Lease Financials" />
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <InputGroup
                  label="Size (SF)"
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
                <InputGroup
                  label="Term (Months)"
                  value={inputs.termInMonths}
                  onChange={set('termInMonths')}
                  placeholder="e.g. 60"
                />
                <SelectGroup
                  label="Rent Type"
                  value={inputs.rentType}
                  onChange={set('rentType')}
                  options={['NNN', 'MG', 'G', 'IG', 'FSG']}
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
                  label="TI Allowance ($)"
                  value={inputs.tiA}
                  onChange={set('tiA')}
                  placeholder="0"
                />
                <InputGroup
                  label="Effective Rent"
                  value={result ? `$${result.results.effectiveRate.toFixed(rateDecimals)}` : ''}
                  onChange={() => {}}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div>
            <SectionHeader icon={Calendar} title="Dates" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
              label="Net Total"
              value={`$${result.results.netTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtext="After Free Rent"
            />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Year 1 Annual"
              value={`$${result.results.year1AnnualRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtext="Annual Rent"
            />
            <ResultCard
              label="Free Rent Value"
              value={`$${result.results.freeRentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              subtext="Concession"
            />
            <ResultCard
              label="TI / SF"
              value={result.results.tiPerSqFt > 0 ? `$${result.results.tiPerSqFt.toFixed(2)}` : '—'}
              subtext="Tenant Improvement"
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
                      <td className="px-4 py-3">${row.monthlyRent.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">${row.periodTotal.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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
