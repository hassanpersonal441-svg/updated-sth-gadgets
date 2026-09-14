'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'not_authorized' ? 'This account is not authorized for admin access.' : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmed = email.trim();
    const cleanLower = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
    const isAlias =
      cleanLower === 'adminsthgadgets' ||
      cleanLower === 'adminsthgadets' ||
      cleanLower === 'admin' ||
      cleanLower === 'sthgadgets';
    const targetEmail = isAlias ? 'hm7599733@gmail.com' : trimmed;

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: targetEmail, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05080E] px-4">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#00C4CC]/10 blur-[120px]"></div>

      <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-[#0C1420]/90 p-8 shadow-[0_0_50px_rgba(0,196,204,0.12)] backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2 h-16 w-16 overflow-hidden rounded-full border-2 border-[#00C4CC] bg-black p-0.5 shadow-[0_0_20px_rgba(0,196,204,0.4)]">
            <Image src="/images/logo.png" alt="STH Gadgets" fill className="object-cover rounded-full" priority />
          </div>
          <h1 className="mt-3 font-display text-2xl font-black uppercase tracking-wider text-silver-bright">
            STH GADGETS
          </h1>
          <span className="mt-1 inline-block rounded bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#00C4CC]">
            Admin Control Panel
          </span>
          <p className="mt-2 text-xs text-silver-dim">
            Authorized administrator credentials required
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              Admin Email or Username
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin-sth-gadgets or email"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2.5 text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none focus:ring-1 focus:ring-[#00C4CC]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2.5 text-sm text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none focus:ring-1 focus:ring-[#00C4CC]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] py-3 font-display text-sm font-bold text-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>

        {/* Back to store link */}
        <div className="mt-6 text-center border-t border-slate-800/80 pt-4">
          <Link
            href="/"
            className="text-xs font-semibold text-silver-dim hover:text-[#00C4CC] transition flex items-center justify-center gap-1.5"
          >
            <span>←</span>
            <span>Back to Live Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
