import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isPlaceholderSupabaseUrl = String(supabaseUrl || '').includes('placeholder');
const isPlaceholderAnonKey = String(supabaseAnonKey || '').toLowerCase() === 'placeholder';
export const isSupabaseEnabled = Boolean(
    supabaseUrl
    && supabaseAnonKey
    && !isPlaceholderSupabaseUrl
    && !isPlaceholderAnonKey
);

if (!isSupabaseEnabled) {
    console.warn('AURA: Supabase credentials missing/invalid in environment variables.');
}

export const supabase = createClient(
    (!isPlaceholderSupabaseUrl && supabaseUrl) || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

console.log('AURA: Supabase client initialized');
