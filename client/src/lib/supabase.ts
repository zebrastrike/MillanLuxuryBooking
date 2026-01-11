import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_PUBLIC_KEY || '';

if (!supabaseUrl) {
  console.error('[Supabase] VITE_SUPABASE_URL is not set');
}

if (!supabaseAnonKey) {
  console.error('[Supabase] VITE_SUPABASE_ANON_PUBLIC_KEY is not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
