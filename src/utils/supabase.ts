import { createClient } from '@supabase/supabase-js';

// Mengambil key dengan aman dari file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL dan Key harus diisi di file .env!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);