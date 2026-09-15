import { createClient } from '@/lib/supabase/server';

/** Verifies the current request's session belongs to a user with an admin profile row.
 *  Returns the user id if authorized, or null if not. Use at the top of every
 *  admin-only API route before performing any write.
 */
export async function requireAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (!profile) return null;

  return { userId: user.id };
}
