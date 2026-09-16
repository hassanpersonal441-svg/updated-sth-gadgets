import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

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
  // If no auth tokens are present at all, avoid expensive network roundtrip to Supabase.
  const hasAuthToken = request.cookies.getAll().some((c) => c.name.includes('-auth-token'));

  if (!hasAuthToken) {
    if (isDirectAdminRoot || isCustomAdminAlias || isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

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
