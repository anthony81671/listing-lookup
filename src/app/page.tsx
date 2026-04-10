'use client';

import { useState } from 'react';
import { ListingsSearch } from '@/components/listings-search';
import { LeaseCalculator } from '@/components/lease-calculator';
import type { UnifiedListing } from '@/types';
import { Building2, Calculator } from 'lucide-react';

type Tab = 'listings' | 'calculator';

export default function Home() {
  const [tab, setTab] = useState<Tab>('listings');
  const [calcPrefill, setCalcPrefill] = useState<UnifiedListing | null>(null);

  const handleUseInCalculator = (listing: UnifiedListing) => {
    setCalcPrefill(listing);
    setTab('calculator');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-slate-700" />
              <span className="font-bold text-slate-900 text-sm tracking-tight">ListingLookup</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setTab('listings')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'listings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <Building2 size={14} />
                Listings
              </button>
              <button
                onClick={() => setTab('calculator')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'calculator' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}`}
              >
                <Calculator size={14} />
                Lease Calculator
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {tab === 'listings'
          ? <ListingsSearch onUseInCalculator={handleUseInCalculator} />
          : <LeaseCalculator prefill={calcPrefill} onClearPrefill={() => setCalcPrefill(null)} />
        }
      </main>
    </div>
  );
}
