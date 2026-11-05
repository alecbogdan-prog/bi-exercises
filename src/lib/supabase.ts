import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Accept the URL with or without a trailing /rest/v1/ (as copied from the dashboard's Data API page).
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/(rest\/v1\/?)?$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** The Supabase client, or null when the site is built without Supabase keys (accounts then stay off). */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export const accountsEnabled = supabase !== null;
