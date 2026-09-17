import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ttktpavtgfrndvvrlwoa.supabase.co'
)
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3RwYXZ0Z2ZybmR2dnJsd29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzcwNzAsImV4cCI6MjEwNDYxMzA3MH0.0OiLDfU1Whk1S-qVf1OAvBDGGv391rVe58FdZRmKklU';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3RwYXZ0Z2ZybmR2dnJsd29hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTAzNzA3MCwiZXhwIjoyMTA0NjEzMDcwfQ.qHka7SKAMmKhF4Tcs-zgT52WOx184K4JPSIYCSfPs1g';

// Standard server client — respects the logged-in user's session and RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // called from a Server Component with no writable cookies — safe to ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

// Singleton public client — used for public storefront reads.
let publicClient: ReturnType<typeof createSupabaseClient> | null = null;

export function getPublicClient() {
  if (!publicClient) {
    publicClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return publicClient;
}

export function createServiceClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}
