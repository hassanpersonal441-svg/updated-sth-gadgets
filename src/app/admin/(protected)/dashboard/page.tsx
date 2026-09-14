import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getStats() {
  const supabase = createClient();

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: outOfStock },
    { count: totalCategories },
    { count: activeCoupons },
    { data: recentProducts },
    { count: whatsappClicks },
    { data: approvedOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'out_of_stock'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('products').select('id, name, price, active, created_at, stock_status').order('created_at', { ascending: false }).limit(6),
    supabase.from('whatsapp_clicks').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('subtotal, order_items(unit_price, purchase_price, quantity, line_total)').in('status', ['approved', 'processing', 'shipped', 'delivered']),
  ]);

  let totalRevenue = 0;
  let totalCost = 0;
  (approvedOrders || []).forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      const rev = Number(item.line_total) || (Number(item.unit_price) * (item.quantity || 1));
      const cost = (Number(item.purchase_price) || 0) * (item.quantity || 1);
      totalRevenue += rev;
      totalCost += cost;
    });
  });

  const grossProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;

  return {
    totalProducts: totalProducts || 0,
    activeProducts: activeProducts || 0,
    outOfStock: outOfStock || 0,
    totalCategories: totalCategories || 0,
    activeCoupons: activeCoupons || 0,
    recentProducts: recentProducts || [],
    whatsappClicks: whatsappClicks || 0,
    totalRevenue,
    totalCost,
    grossProfit,
    avgMargin,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: 'Gross Profit',
      value: `PKR ${stats.grossProfit.toLocaleString('en-PK')}`,
      icon: '💰',
      color: 'from-emerald-500/20 to-transparent',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      href: '/admin/profit',
    },
    {
      label: 'Profit Margin',
      value: `${stats.avgMargin}%`,
      icon: '📊',
      color: 'from-cyan-500/20 to-transparent',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-[#00C4CC]',
      href: '/admin/profit',
    },
    {
      label: 'Total Product Cost',
      value: `PKR ${stats.totalCost.toLocaleString('en-PK')}`,
      icon: '🏷️',
      color: 'from-amber-500/20 to-transparent',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400',
      href: '/admin/profit',
    },
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: '📦',
      color: 'from-cyan-500/20 to-transparent',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-[#00C4CC]',
      href: '/admin/products',
    },
    {
      label: 'Active Listed',
      value: stats.activeProducts,
      icon: '🟢',
      color: 'from-emerald-500/20 to-transparent',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      href: '/admin/products',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStock,
      icon: '⚠️',
      color: 'from-rose-500/20 to-transparent',
      borderColor: 'border-rose-500/30',
      textColor: 'text-rose-400',
      href: '/admin/products',
    },
    {
      label: 'Categories',
      value: stats.totalCategories,
      icon: '🏷️',
      color: 'from-blue-500/20 to-transparent',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      href: '/admin/categories',
    },
    {
      label: 'Active Coupons',
      value: stats.activeCoupons,
      icon: '🎟️',
      color: 'from-purple-500/20 to-transparent',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      href: '/admin/coupons',
    },
    {
      label: 'WhatsApp Orders Tracked',
      value: stats.whatsappClicks,
      icon: '💬',
      color: 'from-emerald-500/20 to-transparent',
      borderColor: 'border-[#25D366]/30',
      textColor: 'text-[#25D366]',
      href: '/admin/dashboard',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
              Dashboard Overview
            </h1>
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Synced
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Manage your mobile accessories catalog, WhatsApp rate sheets, and business configuration.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products/new"
            className="flex items-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.35)] transition hover:scale-[1.02]"
          >
            <span>+</span>
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`group relative overflow-hidden rounded-xl border ${c.borderColor} bg-[#0C1420] px-4 py-3 shadow-sm transition hover:border-[#00C4CC]/60 hover:shadow-[0_0_15px_rgba(0,196,204,0.1)]`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-30 transition group-hover:opacity-60`}></div>
            <div className="relative flex items-center justify-between">
              <span className="text-lg">{c.icon}</span>
              <span className="text-[10px] text-silver-dim group-hover:text-silver-bright transition">↗</span>
            </div>
            <div className="relative mt-2">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-silver-dim truncate">
                {c.label}
              </p>
              <p className={`mt-0.5 font-display text-lg sm:text-xl font-black ${c.textColor} truncate`}>
                {c.value.toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Products Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <h2 className="font-display text-base font-bold text-silver-bright">Recently Added Products</h2>
          </div>
          <Link
            href="/admin/products"
            className="font-display text-xs font-semibold text-[#00C4CC] hover:underline"
          >
            View All Products →
          </Link>
        </div>

        {stats.recentProducts.length === 0 ? (
          <div className="py-12 text-center text-silver-dim">
            <p className="text-sm">No products added yet.</p>
            <Link
              href="/admin/products/new"
              className="mt-3 inline-block rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-bold text-black"
            >
              + Add First Product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-800/80 bg-[#080D15]/50 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.recentProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4 font-semibold text-silver-bright">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 font-display font-bold text-[#00C4CC]">
                      Rs. {Number(p.price).toLocaleString('en-PK')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          p.stock_status === 'in_stock'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : p.stock_status === 'low_stock'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {(p.stock_status || 'in_stock').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          p.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        {p.active ? 'Active' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/admin/products"
          className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 hover:border-[#00C4CC]/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl border border-cyan-500/20">
              📦
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-silver-bright group-hover:text-[#00C4CC] transition">
                Manage Products
              </h3>
              <p className="text-xs text-silver-dim">Upload images, edit rates, adjust stock</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/categories"
          className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 hover:border-blue-500/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-xl border border-blue-500/20">
              🏷️
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-silver-bright group-hover:text-blue-400 transition">
                Manage Categories
              </h3>
              <p className="text-xs text-silver-dim">Create & organize device categories</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 hover:border-purple-500/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-xl border border-purple-500/20">
              ⚙️
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-silver-bright group-hover:text-purple-400 transition">
                Store Settings
              </h3>
              <p className="text-xs text-silver-dim">WhatsApp number, order template, branding</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
