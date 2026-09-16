import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getFinanceStats() {
  const supabase = createServiceClient();

  const { data: borrowings } = await supabase
    .from('borrowings')
    .select('*, repayments(*)')
    .order('created_at', { ascending: false });

  const list = borrowings || [];
  let totalBorrowed = 0;
  let totalRepaid = 0;
  let totalOutstanding = 0;
  let activeCount = 0;
  let partiallyPaidCount = 0;
  let fullyPaidCount = 0;

  list.forEach((b: any) => {
    const borrowed = Number(b.borrowed_amount) || 0;
    const repaid = Number(b.total_repaid) || 0;
    const remaining = Number(b.remaining_amount) || 0;

    totalBorrowed += borrowed;
    totalRepaid += repaid;
    totalOutstanding += remaining;

    if (b.status === 'active') activeCount++;
    else if (b.status === 'partially_paid') partiallyPaidCount++;
    else if (b.status === 'fully_paid') fullyPaidCount++;
  });

  // Recent 5 Repayments
  const { data: recentRepayments } = await supabase
    .from('repayments')
    .select('*, borrowings(lender_name, whatsapp_number, borrowing_number)')
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    totalBorrowed,
    totalRepaid,
    totalOutstanding,
    activeCount,
    partiallyPaidCount,
    fullyPaidCount,
    recentBorrowings: list.slice(0, 5),
    recentRepayments: recentRepayments || [],
    totalCount: list.length,
  };
}

export default async function FinanceDashboardPage() {
  const stats = await getFinanceStats();

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <h1 className="font-display text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
              Finance & Capital Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track capital borrowed from lenders to fulfill customer orders and manage repayments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/finance/borrowings"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 px-4 py-2.5 text-xs font-bold text-black shadow-md hover:brightness-110 transition"
          >
            <span>➕ Add / Manage Borrowings</span>
          </Link>
          <Link
            href="/admin/finance/repayments"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[#0C1420] px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            <span>📜 Repayment Audit History</span>
          </Link>
        </div>
      </div>

      {/* 6 Key Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Borrowed */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-3 top-3 text-3xl opacity-10">💰</div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Capital Borrowed
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-white">
            Rs. {stats.totalBorrowed.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total capital raised across all borrowings</p>
        </div>

        {/* Total Repaid */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-3 top-3 text-3xl opacity-15">💵</div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Total Repaid to Lenders
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-emerald-400">
            Rs. {stats.totalRepaid.toLocaleString()}
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-1">Capital successfully returned</p>
        </div>

        {/* Outstanding Amount */}
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-3 top-3 text-3xl opacity-15">🔴</div>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Net Outstanding Balance
          </span>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-rose-400">
            Rs. {stats.totalOutstanding.toLocaleString()}
          </div>
          <p className="text-[11px] text-rose-400/80 mt-1">Remaining balance owed to lenders</p>
        </div>

        {/* Active Borrowings */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">🔵 Active Borrowings</span>
            <div className="font-mono text-xl font-black text-white mt-1">{stats.activeCount}</div>
          </div>
          <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-400">
            Unpaid
          </span>
        </div>

        {/* Partially Paid */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">🟡 Partially Paid</span>
            <div className="font-mono text-xl font-black text-amber-400 mt-1">{stats.partiallyPaidCount}</div>
          </div>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400">
            In Progress
          </span>
        </div>

        {/* Fully Paid */}
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase">🟢 Fully Paid</span>
            <div className="font-mono text-xl font-black text-emerald-400 mt-1">{stats.fullyPaidCount}</div>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
            Completed
          </span>
        </div>
      </div>

      {/* 2 Grid Tables: Recent Borrowings & Recent Repayments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Borrowings (lg:col-span-7) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
              Recent Borrowing Records
            </h2>
            <Link
              href="/admin/finance/borrowings"
              className="text-xs font-semibold text-[#00C4CC] hover:underline"
            >
              View All ({stats.totalCount}) →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2 px-3"># BOR ID</th>
                  <th className="py-2 px-3">Lender</th>
                  <th className="py-2 px-3 text-right">Borrowed</th>
                  <th className="py-2 px-3 text-right">Remaining</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {stats.recentBorrowings.length > 0 ? (
                  stats.recentBorrowings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-[#00C4CC]">{b.borrowing_number}</td>
                      <td className="py-3 px-3 font-sans font-medium text-white">{b.lender_name}</td>
                      <td className="py-3 px-3 text-right">Rs. {Number(b.borrowed_amount).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right text-rose-400 font-bold">
                        Rs. {Number(b.remaining_amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-sans border ${
                            b.status === 'fully_paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : b.status === 'partially_paid'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {b.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                      No borrowings recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Repayments (lg:col-span-5) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-wider text-emerald-400">
              Recent Repayments
            </h2>
            <Link
              href="/admin/finance/repayments"
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              History →
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recentRepayments.length > 0 ? (
              stats.recentRepayments.map((r: any) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-slate-800/80 bg-[#080D15] p-3 text-xs flex items-center justify-between font-mono"
                >
                  <div>
                    <span className="font-bold text-white font-sans">
                      {r.borrowings?.lender_name || 'Lender'}
                    </span>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      <span>{r.repayment_number || 'Repayment'}</span> •{' '}
                      <span>{r.payment_method}</span> • <span>{r.repayment_date}</span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-400 text-sm">
                    +Rs. {Number(r.amount).toLocaleString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-slate-500 font-sans">
                No repayments logged yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
