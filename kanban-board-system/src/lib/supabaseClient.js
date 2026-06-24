import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://mock-supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'mock-key';

// TODO: Initialize Supabase client (handles Auth, DB, Realtime)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
