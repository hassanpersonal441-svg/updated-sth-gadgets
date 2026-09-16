import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ttktpavtgfrndvvrlwoa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3RwYXZ0Z2ZybmR2dnJsd29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzcwNzAsImV4cCI6MjEwNDYxMzA3MH0.0OiLDfU1Whk1S-qVf1OAvBDGGv391rVe58FdZRmKklU';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
