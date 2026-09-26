import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ttktpavtgfrndvvrlwoa.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0a3RwYXZ0Z2ZybmR2dnJsd29hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzcwNzAsImV4cCI6MjEwNDYxMzA3MH0.0OiLDfU1Whk1S-qVf1OAvBDGGv391rVe58FdZRmKklU';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;

  // Custom alias /admin-sth-gadgets and direct /admin root access:
  const isDirectAdminRoot = path === '/admin' || path === '/admin/';
  const isCustomAdminAlias =
    path === '/admin-sth-gadgets' ||
    path === '/admin-sthgadgets' ||
    path === '/admin-sth-gadets' ||
    path === '/admin-sthgadets';

  const isAdminRoute =
    (path.startsWith('/admin') ||
      path.startsWith('/admin-sth-gadgets') ||
      path.startsWith('/admin-sthgadgets')) &&
    path !== '/admin/login';

  // Fast path: Check if any Supabase auth cookies exist.
  const hasAuthToken = request.cookies.getAll().some((c) => c.name.includes('-auth-token'));

  if (!hasAuthToken) {
    if (isDirectAdminRoot || isCustomAdminAlias || isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    });

    // Token exists: verify user session with Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isDirectAdminRoot || isCustomAdminAlias) {
      const url = request.nextUrl.clone();
      url.pathname = user ? '/admin/dashboard' : '/admin/login';
      return NextResponse.redirect(url);
    }

    if (isAdminRoute) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
      }

      // Fast path for role check: If already verified in this session, avoid extra database query
      const verifiedAdmin = request.cookies.get('sth_admin_verified')?.value;
      if (verifiedAdmin !== user.id) {
        // Confirm the user actually has an admin profile row
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          const url = request.nextUrl.clone();
          url.pathname = '/admin/login';
          url.searchParams.set('error', 'not_authorized');
          return NextResponse.redirect(url);
        }

        // Cache admin verification for 8 hours
        response.cookies.set('sth_admin_verified', user.id, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 8,
        });
      }
    }
  } catch (middlewareErr) {
    console.warn('Middleware auth verification error:', middlewareErr);
    if (isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/admin-sth-gadgets/:path*',
    '/admin-sth-gadgets',
    '/admin-sthgadgets/:path*',
    '/admin-sthgadgets',
    '/admin-sth-gadets',
    '/admin-sthgadets',
  ],
};
