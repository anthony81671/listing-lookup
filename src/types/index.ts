export interface UnifiedListing {
  report_id: number;
  source: 'ILS' | 'AIR';
  listing_number: string | null;
  listing_date: string | null;
  street_address: string | null;
  suite: string | null;
  city: string | null;
  state: string | null;
  market: string | null;
  submarket: string | null;
  property_name: string | null;
  building_sqft: string | null;
  available_sqft: string | null;
  office_sqft: string | null;
  clear_height: string | null;
  dh_doors: string | null;
  gl_doors: string | null;
  sprinklers: string | null;
  rail_access: string | null;
  amperage: string | null;
  parking_spaces: string | null;
  parking_ratio: string | null;
  yard_space: string | null;
  rate_per_sf: string | null;
  rent_type: string | null;
  sale_price_per_sf: string | null;
  total_sale_price: string | null;
  highlights: string | null;
  comments: string | null;
  company_agent: string | null;
  listing_status: string | null;
  photo_url: string | null;
  pdf_url: string | null;
  property_link: string | null;
  marketing_flyer: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CalcInputs {
  sqFt: string;
  rentPerSqFt: string;
  termInMonths: string;
  occupancyDate: string;
  freeRentMonths: string;
  rentAdjustments: string;
  tiA: string;
  rentType: string;
  daysOnMarket: string;
  landAcres: string;
  parkingRatio: string;
}

export interface CalcResults {
  totalConsideration: number;
  effectiveRate: number;
  averageRate: number;
  freeRentValue: number;
  netTotal: number;
  expireDate: Date | null;
  tiPerSqFt: number;
  year1AnnualRent: number;
}

export interface RentScheduleRow {
  year: number;
  rate: number;
  months: number;
  monthlyRent: number;
  periodTotal: number;
}
