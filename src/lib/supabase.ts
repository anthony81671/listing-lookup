import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Read-only client — anon key only, no auth, no write operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
