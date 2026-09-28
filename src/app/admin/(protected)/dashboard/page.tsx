import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds for better performance

async function getStats() {
  const supabase = createServiceClient();

  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalProducts },
    { count: activeProducts },
    { count: outOfStock },
    { count: lowStock },
    { count: totalCategories },
    { data: recentProducts },
    { count: totalOrders },
    { count: pendingOrders },
    { data: todayOrders },
    { data: recentOrders },
    { data: approvedOrders },
    { data: vendorPurchases },
    { data: products },
    { data: pendingInvoices },
    { data: lowStockProducts },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'out_of_stock'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('stock_status', 'low_stock'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('id, name, price, active, created_at, stock_status').order('created_at', { ascending: false }).limit(6),
    // Total orders count
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    // Pending orders count
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'pending_payment']),
    // Today's orders for revenue
    supabase.from('orders').select('total_amount').gte('created_at', today),
    // Recent orders for dashboard
    supabase.from('orders').select('id, order_number, customer_name, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5),
    // Fetch all approved/counted orders
    supabase.from('orders').select('id, order_number, subtotal, delivery_charges, actual_courier_cost, delivery_paid_by, order_items(product_id, product_name, unit_price, purchase_price, quantity, line_total)').in('status', ['approved', 'pending_payment', 'processing', 'shipped', 'delivered']),
    // All vendor purchases
    supabase.from('vendor_purchases').select('id, order_number, product_name, quantity, wholesale_cost, status'),
    // Products catalog for fallback purchase price
    supabase.from('products').select('id, name, purchase_price'),
    // Pending invoices
    supabase.from('invoices').select('id, invoice_number, customer_name, total_amount, status, due_date').in('status', ['pending', 'overdue']).order('created_at', { ascending: false }).limit(5),
    // Low stock products list
    supabase.from('products').select('id, name, price, stock_status').eq('stock_status', 'low_stock').limit(6),
  ]);

  const productMap = new Map<string, any>();
  (products || []).forEach((p: any) => productMap.set(p.id, p));

  // Build vendor purchase lookup by order_number
  const vendorByOrder = new Map<string, any[]>();
  (vendorPurchases || []).forEach((vp: any) => {
    const key = (vp.order_number || '').trim().toUpperCase();
    if (!key) return;
    if (!vendorByOrder.has(key)) vendorByOrder.set(key, []);
    vendorByOrder.get(key)!.push(vp);
  });

  const consumedVpIds = new Set<string>();

  let totalRevenue = 0;
  let totalCost = 0;
  let totalCustomerDeliveryFees = 0;
  let totalActualCourierCost = 0;
  let totalStoreDeliveryExpense = 0;

  // 1. Process counted orders with priority hierarchy
  (approvedOrders || []).forEach((o: any) => {
    const orderKey = (o.order_number || '').trim().toUpperCase();
    const linkedVp: any[] = orderKey ? (vendorByOrder.get(orderKey) || []) : [];

    let orderRevenue = 0;
    let orderCost = 0;

    (o.order_items || []).forEach((item: any) => {
      const qty = item.quantity || 1;
      const lineRevenue = Number(item.line_total) || (Number(item.unit_price) * qty);
      orderRevenue += lineRevenue;

      const itemName = (item.product_name || '').toLowerCase().trim();
      const prod = productMap.get(item.product_id);

      let unitCost = 0;

      // Priority 1: Actual recorded vendor purchase for this order
      const vpIdx = linkedVp.findIndex((vp) => {
        if (consumedVpIds.has(vp.id)) return false;
        const vpName = (vp.product_name || '').toLowerCase().trim();
        return vpName === itemName || vpName.includes(itemName) || itemName.includes(vpName);
      });

      if (vpIdx !== -1) {
        consumedVpIds.add(linkedVp[vpIdx].id);
        unitCost = Number(linkedVp[vpIdx].wholesale_cost) || 0;
      } else if (Number(item.purchase_price) > 0) {
        // Priority 2: Snapshot recorded at checkout / order time
        unitCost = Number(item.purchase_price);
      } else if (Number(prod?.purchase_price) > 0) {
        // Priority 3: Product catalog fallback
        unitCost = Number(prod.purchase_price);
      }
      // Priority 4: 0 (missing cost; never invented)

      orderCost += unitCost * qty;
    });

    // Unlisted vendor purchases for this specific order
    linkedVp.forEach((vp: any) => {
      if (consumedVpIds.has(vp.id)) return;
      consumedVpIds.add(vp.id);
      orderCost += (Number(vp.wholesale_cost) || 0) * (Number(vp.quantity) || 1);
    });

    // Delivery Accounting per order
    const customerFee = Number(o.delivery_charges) || 0;
    const courierCost = (o.actual_courier_cost !== undefined && o.actual_courier_cost !== null)
      ? Number(o.actual_courier_cost)
      : customerFee;
    const storeExpense = Math.max(0, courierCost - customerFee);

    totalCustomerDeliveryFees += customerFee;
    totalActualCourierCost += courierCost;
    totalStoreDeliveryExpense += storeExpense;

    totalRevenue += orderRevenue;
    totalCost += orderCost;
  });

  // 2. All remaining vendor purchases (general / historical / inventory purchases)
  (vendorPurchases || []).forEach((vp: any) => {
    if (consumedVpIds.has(vp.id)) return;
    consumedVpIds.add(vp.id);
    totalCost += (Number(vp.wholesale_cost) || 0) * (Number(vp.quantity) || 1);
  });

  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - totalStoreDeliveryExpense;
  const avgMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

  const pendingVendorCount = (vendorPurchases || []).filter((p: any) => p.status === 'pending').length;
  const totalVendorCost = (vendorPurchases || []).reduce((sum: number, p: any) => sum + (Number(p.wholesale_cost) || 0) * (Number(p.quantity) || 1), 0);
  const recentVendorPurchases = (vendorPurchases || []).slice(0, 5);
  const pendingInvoicesCount = (pendingInvoices || []).length;

  // Calculate today's revenue
  const todayRevenue = (todayOrders || []).reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);

  return {
    totalProducts: totalProducts || 0,
    activeProducts: activeProducts || 0,
    outOfStock: outOfStock || 0,
    lowStock: lowStock || 0,
    lowStockProducts: lowStockProducts || [],
    totalCategories: totalCategories || 0,
    recentProducts: recentProducts || [],
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    recentOrders: recentOrders || [],
    todayRevenue,
    totalRevenue,
    totalCost,
    grossProfit,
    netProfit,
    avgMargin,
    totalCustomerDeliveryFees,
    totalActualCourierCost,
    totalStoreDeliveryExpense,
    pendingVendorCount,
    totalVendorCost,
    recentVendorPurchases: recentVendorPurchases || [],
    pendingInvoices: pendingInvoices || [],
    pendingInvoicesCount,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: '📋',
      color: 'from-violet-500/20 to-transparent',
      borderColor: 'border-violet-500/30',
      textColor: 'text-violet-400',
      href: '/admin/orders',
    },
    {
      label: 'Pending Orders',
      value: stats.pendingOrders,
      icon: '⏳',
      color: 'from-amber-500/20 to-transparent',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-300',
      href: '/admin/orders',
    },
    {
      label: "Today's Revenue",
      value: `PKR ${stats.todayRevenue.toLocaleString('en-PK')}`,
      icon: '💵',
      color: 'from-cyan-500/20 to-transparent',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-[#00C4CC]',
      href: '/admin/orders',
    },
    {
      label: 'Active Products',
      value: stats.activeProducts,
      icon: '📦',
      color: 'from-emerald-500/20 to-transparent',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400',
      href: '/admin/products',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStock,
      icon: '🚫',
      color: 'from-rose-500/20 to-transparent',
      borderColor: 'border-rose-500/30',
      textColor: 'text-rose-400',
      href: '/admin/products',
    },
    {
      label: 'Pending Invoices',
      value: stats.pendingInvoicesCount,
      icon: '�',
      color: 'from-yellow-500/20 to-transparent',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      href: '/admin/invoices',
    },
    {
      label: 'Pending Vendor Purchases',
      value: `${stats.pendingVendorCount} Pending`,
      icon: '🏪',
      color: 'from-indigo-500/20 to-transparent',
      borderColor: 'border-indigo-500/30',
      textColor: 'text-indigo-400',
      href: '/admin/vendor-purchases',
    },
    {
      label: 'Store Delivery Expense',
      value: `PKR ${stats.totalStoreDeliveryExpense.toLocaleString('en-PK')}`,
      icon: '🚚',
      color: 'from-orange-500/20 to-transparent',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-400',
      href: '/admin/profit',
    },
    {
      label: 'Total Vendor Cost',
      value: `PKR ${stats.totalVendorCost.toLocaleString('en-PK')}`,
      icon: '💳',
      color: 'from-pink-500/20 to-transparent',
      borderColor: 'border-pink-500/30',
      textColor: 'text-pink-400',
      href: '/admin/vendor-purchases',
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
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
                {typeof c.value === 'string' ? c.value : c.value.toLocaleString()}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Dashboard Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h2 className="font-display text-base font-bold text-silver-bright">Recent Orders</h2>
            </div>
            <Link
              href="/admin/orders"
              className="font-display text-xs font-semibold text-[#00C4CC] hover:underline"
            >
              View All Orders →
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="py-12 text-center text-silver-dim">
              <p className="text-sm">No orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800/80 bg-[#080D15]/50 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Order #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-display font-bold text-silver-bright">
                        #{order.order_number}
                      </td>
                      <td className="px-6 py-4 text-silver-bright">
                        {order.customer_name || 'Guest'}
                      </td>
                      <td className="px-6 py-4 font-display font-bold text-[#00C4CC]">
                        PKR {Number(order.total_amount).toLocaleString('en-PK')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            order.status === 'delivered'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : order.status === 'pending' || order.status === 'pending_payment'
                              ? 'bg-amber-500/15 text-amber-400'
                              : order.status === 'cancelled'
                              ? 'bg-rose-500/15 text-rose-400'
                              : 'bg-blue-500/15 text-blue-400'
                          }`}
                        >
                          {order.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Vendor Purchases */}
        <div className="overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#0C1420] shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-base">🏪</span>
              <h2 className="font-display text-base font-bold text-indigo-400">Recent Vendor Purchases</h2>
            </div>
            <Link
              href="/admin/vendor-purchases"
              className="font-display text-xs font-semibold text-indigo-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          {stats.recentVendorPurchases.length === 0 ? (
            <div className="py-12 text-center text-silver-dim">
              <p className="text-sm">No vendor purchases yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800/80 bg-[#080D15]/50 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Order #</th>
                    <th className="px-6 py-3.5">Product</th>
                    <th className="px-6 py-3.5">Qty</th>
                    <th className="px-6 py-3.5">Cost</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.recentVendorPurchases.map((vp) => (
                    <tr key={vp.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-display font-bold text-silver-bright">
                        #{vp.order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-silver-bright">
                        {vp.product_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 font-display font-bold text-silver-bright">
                        {vp.quantity || 1}
                      </td>
                      <td className="px-6 py-4 font-display font-bold text-pink-400">
                        PKR {Number(vp.wholesale_cost).toLocaleString('en-PK')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            vp.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : vp.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {(vp.status || 'unknown').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        {(stats.lowStockProducts?.length || 0) > 0 && (
          <div className="overflow-hidden rounded-2xl border border-orange-500/30 bg-[#0C1420] shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <h2 className="font-display text-base font-bold text-orange-400">Low Stock Alerts</h2>
              </div>
              <Link
                href="/admin/products"
                className="font-display text-xs font-semibold text-orange-400 hover:underline"
              >
                View All →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800/80 bg-[#080D15]/50 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">Price</th>
                    <th className="px-6 py-3.5">Stock Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {stats.lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-semibold text-silver-bright">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 font-display font-bold text-[#00C4CC]">
                        PKR {Number(p.price).toLocaleString('en-PK')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold text-orange-400">
                          LOW STOCK
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-silver-bright hover:border-orange-400 hover:text-orange-400 transition"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
                      PKR {Number(p.price).toLocaleString('en-PK')}
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
    </div>
  );
}
