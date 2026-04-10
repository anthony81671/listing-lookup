import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListingsSearch } from '@/components/listings-search';
import { LeaseCalculator } from '@/components/lease-calculator';
import { Building2, Calculator } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-3">
            <Building2 className="h-5 w-5 text-slate-700" />
            <span className="font-semibold text-slate-900 text-sm tracking-tight">ListingLookup</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-400">Industrial CRE</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="listings">
          <TabsList className="mb-6">
            <TabsTrigger value="listings" className="gap-2">
              <Building2 className="h-4 w-4" />
              Listings
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Lease Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <ListingsSearch />
          </TabsContent>

          <TabsContent value="calculator">
            <LeaseCalculator />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
