import type { CalcInputs, CalcResults, RentScheduleRow } from '@/types';

function addMonths(dateStr: string, months: number): Date | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Number(months));
  d.setDate(d.getDate() - 1);
  return d;
}

export function calculate(inputs: CalcInputs): {
  results: CalcResults;
  schedule: RentScheduleRow[];
} | null {
  const { sqFt, rentPerSqFt, termInMonths, occupancyDate, freeRentMonths, rentAdjustments, tiA } = inputs;

  if (!sqFt || !rentPerSqFt || !termInMonths || !occupancyDate) return null;

  const dateObj = new Date(occupancyDate);
  if (isNaN(dateObj.getTime())) return null;

  const rate = parseFloat(rentPerSqFt);
  const area = parseFloat(sqFt);
  const term = parseInt(termInMonths);
  const free = parseFloat(freeRentMonths) || 0;
  const tiTotal = parseFloat(tiA) || 0;

  if (isNaN(rate) || isNaN(area) || isNaN(term) || term <= 0 || term > 1200) return null;

  const isFixedIncrease = rentAdjustments.trim().startsWith('$');
  const increaseVal = parseFloat(rentAdjustments.replace(/[^\d.-]/g, ''));
  const increasePct = isFixedIncrease ? 0 : increaseVal / 100;
  const fixedBump = isFixedIncrease ? increaseVal : 0;

  let totalConsideration = 0;
  const schedule: RentScheduleRow[] = [];
  let currentRate = rate;
  let monthsRemaining = term;
  let year = 1;

  while (monthsRemaining > 0) {
    const monthsInThisPeriod = Math.min(monthsRemaining, 12);
    const monthlyRent = area * currentRate;
    const periodTotal = monthlyRent * monthsInThisPeriod;
    schedule.push({ year, rate: currentRate, months: monthsInThisPeriod, monthlyRent, periodTotal });
    totalConsideration += periodTotal;
    monthsRemaining -= monthsInThisPeriod;
    year++;
    if (isFixedIncrease) currentRate = currentRate + fixedBump;
    else currentRate = currentRate * (1 + increasePct);
  }

  const freeRentValue = free * rate * area;
  const netTotal = totalConsideration - freeRentValue;
  const year1AnnualRent = rate * 12 * area;

  const results: CalcResults = {
    totalConsideration,
    effectiveRate: netTotal / term / area,
    averageRate: totalConsideration / term / area,
    freeRentValue,
    netTotal,
    expireDate: addMonths(occupancyDate, term),
    tiPerSqFt: area > 0 ? tiTotal / area : 0,
    year1AnnualRent,
  };

  return { results, schedule };
}

export function formatCurrency(val: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
