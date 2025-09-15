import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let internalClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  internalClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase environment variables are missing. The app will continue to run, but database features will be unavailable until configured.');
}

// Exporta um proxy que só lança erro quando o cliente for realmente usado sem configuração
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!internalClient) {
      throw new Error('Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
    }
    return Reflect.get(internalClient, prop, receiver);
  }
});