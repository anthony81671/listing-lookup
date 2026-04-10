'use client';

import { useState, useMemo } from 'react';
import { calculate, formatCurrency, formatDate } from '@/lib/calculator';
import type { CalcInputs } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

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

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-slate-600">{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );
}

function ResultRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 border-b border-slate-100 last:border-0 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-slate-900 text-base' : 'text-slate-700'}`}>{value}</span>
    </div>
  );
}

export function LeaseCalculator() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);

  const set = (key: keyof CalcInputs) => (val: string) =>
    setInputs(prev => ({ ...prev, [key]: val }));

  const result = useMemo(() => calculate(inputs), [inputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-slate-900">Lease Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Size (SF)" id="sqFt" value={inputs.sqFt} onChange={set('sqFt')} placeholder="e.g. 50000" />
            <Field label="Rate / SF / Mo" id="rentPerSqFt" value={inputs.rentPerSqFt} onChange={set('rentPerSqFt')} placeholder="e.g. 1.25" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Term (Months)" id="termInMonths" value={inputs.termInMonths} onChange={set('termInMonths')} placeholder="e.g. 60" />
            <Field label="Occupancy Date" id="occupancyDate" value={inputs.occupancyDate} onChange={set('occupancyDate')} placeholder="MM/DD/YYYY" type="date" />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Free Rent (Months)" id="freeRentMonths" value={inputs.freeRentMonths} onChange={set('freeRentMonths')} placeholder="0" />
            <Field label="Annual Escalation" id="rentAdjustments" value={inputs.rentAdjustments} onChange={set('rentAdjustments')} placeholder="3% or $0.05" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="TI Allowance ($)" id="tiA" value={inputs.tiA} onChange={set('tiA')} placeholder="0" />
            <Field label="Rent Type" id="rentType" value={inputs.rentType} onChange={set('rentType')} placeholder="NNN" />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-slate-900">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div>
                <ResultRow label="Total Consideration" value={formatCurrency(result.results.totalConsideration, 0)} highlight />
                <ResultRow label="Net Total (after free rent)" value={formatCurrency(result.results.netTotal, 0)} />
                <ResultRow label="Year 1 Annual Rent" value={formatCurrency(result.results.year1AnnualRent, 0)} />
                <ResultRow label="Free Rent Value" value={formatCurrency(result.results.freeRentValue, 0)} />
                <Separator className="my-2" />
                <ResultRow label="Average Rate / SF / Mo" value={`$${result.results.averageRate.toFixed(4)}`} />
                <ResultRow label="Effective Rate / SF / Mo" value={`$${result.results.effectiveRate.toFixed(4)}`} highlight />
                <Separator className="my-2" />
                <ResultRow label="Expiration Date" value={formatDate(result.results.expireDate)} />
                <ResultRow label="TI / SF" value={result.results.tiPerSqFt > 0 ? formatCurrency(result.results.tiPerSqFt) : '—'} />
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">
                Enter size, rate, term, and occupancy date to calculate.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rent Schedule */}
        {result && result.schedule.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900">Rent Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs">Year</TableHead>
                    <TableHead className="text-xs">Months</TableHead>
                    <TableHead className="text-xs text-right">Rate / SF</TableHead>
                    <TableHead className="text-xs text-right">Monthly Rent</TableHead>
                    <TableHead className="text-xs text-right">Period Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.schedule.map(row => (
                    <TableRow key={row.year}>
                      <TableCell className="text-sm py-2">Yr {row.year}</TableCell>
                      <TableCell className="text-sm py-2">{row.months}</TableCell>
                      <TableCell className="text-sm py-2 text-right tabular-nums">${row.rate.toFixed(4)}</TableCell>
                      <TableCell className="text-sm py-2 text-right tabular-nums">{formatCurrency(row.monthlyRent, 0)}</TableCell>
                      <TableCell className="text-sm py-2 text-right tabular-nums font-medium">{formatCurrency(row.periodTotal, 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
